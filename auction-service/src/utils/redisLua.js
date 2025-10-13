import { createClient } from 'redis';
import dotenv from 'dotenv';
import { ApiError } from '../utils/ApiError.js';

dotenv.config();

// Ensure redisClient is imported correctly from config or utils
// NOTE: Assuming redisClient is globally available or imported in this manner in your project
const redisClient = createClient({ url: process.env.REDIS_URL });

// Connect to Redis only if not already connected
// (This may be redundant if already connected in config/redis.js, but ensures the connection is open for eval)
(async () => {
    try {
        if (!redisClient.isReady) {
            await redisClient.connect();
        }
    } catch (err) {
        console.error('Redis connection error in utils/redisLua.js:', err);
    }
})();


// Lua script to perform the atomic bid update:
// KEYS[1]: Redis Key (e.g., auction:123)
// ARGV[1]: New Bid Amount calculated by Node.js (N)
// ARGV[2]: Owner ID
// ARGV[3]: Owner Name
// ARGV[4]: Previous Expected Bid (C) (to ensure atomicity)
const LUA_BID_SCRIPT = `
    local key = KEYS[1];
    local new_bid = tonumber(ARGV[1]);
    local owner_id = ARGV[2];
    local owner_name = ARGV[3];
    local expected_bid = tonumber(ARGV[4]);

    local current_data = redis.call('GET', key);
    local current_bid = 0;
    
    if current_data then
        -- Decode JSON to get current_bid
        local decoded_data = cjson.decode(current_data);
        current_bid = tonumber(decoded_data['currentBid']);
    end

    -- 1. FCFS Check: Only proceed if the current bid hasn't changed since Node.js read it (C == expected_bid).
    if current_bid ~= expected_bid then
        return 0; -- Race condition lost
    end

    -- 2. Update Data and Serialize
    local new_data = {
        currentBid = new_bid,
        currentBidderId = owner_id,
        currentBidderName = owner_name,
        timestamp = os.time()
    };
    local serialized_data = cjson.encode(new_data);

    -- 3. Atomic Write: Set the new state (EX 3600 is 1 hour TTL)
    redis.call('SET', key, serialized_data, 'EX', 3600);
    
    return 1; -- Success
`;

export const executeAtomicBid = async (auctionId, newBid, ownerId, ownerName, expectedCurrentBid) => {
    const key = `auction:${auctionId}`;
    
    // NOTE: The 'eval' command syntax requires the number of KEYS (1) followed by the key and ARGV
    const result = await redisClient.eval(
        LUA_BID_SCRIPT, 
        1, 
        key, 
        newBid.toString(), 
        ownerId, 
        ownerName, 
        expectedCurrentBid.toString()
    );
    
    // Redis returns 1 (success) or 0 (failure) from the Lua script
    return parseInt(result, 10);
};
