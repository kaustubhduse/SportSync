import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Auction from '../models/auction.model.js';
import { redisClient} from '../config/redis.js';
import { getEventDetails } from '../cross-services/auction.cross-service.js';
import { executeAtomicBid } from '../utils/redisLua.js'; // <-- NEW IMPORT

const getAuctionKey = (id) => `auction:${id}`;

// Helper function to calculate the next bid based on business rules
const calculateNextBid = (currentBid) => {
    if (currentBid < 100) return currentBid + 10;
    if (currentBid >= 100 && currentBid < 200) return currentBid + 5;
    return currentBid + 2;
};

// Function to save the *winning* bid asynchronously to MongoDB (low priority, non-blocking)
const persistBidToMongoAsync = async (auctionId, newBid, ownerId, ownerName) => {
    try {
        await Auction.updateOne(
            { _id: auctionId },
            { 
                $set: {
                    currentBid: newBid,
                    currentBidderId: ownerId,
                    currentBidderName: ownerName,
                    updatedAt: new Date()
                }
            }
        );
    } catch (error) {
        console.error(`ERROR: Failed to persist bid to MongoDB for Auction ${auctionId}.`, error);
        
    }
};


export const placeAutoBid = asyncHandler(async (req, res) => {
    const { id: auctionId } = req.params;
    // Assuming owner data is provided by VerifyJWT middleware
    const ownerId = req.user.id; 
    const ownerName = req.user.name;

    if (!auctionId || !ownerId) {
        throw new ApiError(400, "Auction ID or Owner ID missing.");
    }

    // 1. READ CURRENT STATE (Redis or DB Fallback)
    const cached = await redisClient.get(getAuctionKey(auctionId));
    let currentBid = 0;

    if (cached) {
        currentBid = JSON.parse(cached).currentBid || 0;
    } else {
        // Fallback to MongoDB if cache misses (read-through)
        const auction = await Auction.findById(auctionId, 'currentBid currentBidderId currentBidderName').lean();
        if (!auction) throw new ApiError(404, "Auction not found");
        
        currentBid = auction.currentBid || 0;
        // Prime the cache after reading from DB
        await redisClient.set(getAuctionKey(auctionId), JSON.stringify(auction), { EX: 3600 });
    }
    
    // 2. CALCULATE NEW BID (Node.js calculates the value)
    const newBid = calculateNextBid(currentBid);
    
    // 3. ATOMIC WRITE (Lua Script) - The critical step
    // The script checks if currentBid == currentBid in Redis AND updates Redis atomically.
    const result = await executeAtomicBid(auctionId, newBid, ownerId, ownerName, currentBid);

    if (result === 1) {
        // SUCCESS: Lua script confirmed we won the race and updated Redis.

        // 4. ASYNC PERSISTENCE: Send the winning state to MongoDB without blocking the response.
        persistBidToMongoAsync(auctionId, newBid, ownerId, ownerName); 
        
        // 5. NOTIFY CLIENTS & RESPOND: Broadcast the win immediately after Redis commit.
        req.io.to(auctionId).emit("newBid", {
            auctionId,
            bid: newBid,
            ownerId,
            ownerName,
            message: `${ownerName} set the new price!`
        });

        return res.status(200).json({ 
            message: "Bid accepted (Redis-First FCFS)", 
            bid: newBid, 
            ownerId 
        });

    } else {
        // FAILURE (result === 0): Lua script determined another bid was accepted faster.
        return res.status(409).json({
            message: "Bid failed. Another bid was accepted faster. Please check the current price and bid again."
        });
    }
});


export const createAuction = asyncHandler(async (req, res) => {
    try {
        const { eventId, auctionDate, auctionTime, auctionLocation } = req.body;
    
        if (!eventId) {
            return res.status(400).json({ message: 'Event ID is required' });
        }
    
        const eventDetails = await getEventDetails(eventId, req.headers.authorization);
        if (!eventDetails || !eventDetails.success || !eventDetails.data) {
            return res.status(404).json({ message: 'Event not found or invalid response' });
        }

        console.log("Event details:", eventDetails);
    
        const event = eventDetails.data;
    
        const auctionData = {
            eventId: event._id,
            eventCategory: event.category,
            eventName: event.name,
            eventDescription: event.description,
            auctionDate,
            auctionTime,
            auctionLocation,
            players: [],
            teams: [],
            currentBid: 0, 
            currentBidderId: null,
            currentBidderName: null,
        };
    
        const auction = new Auction(auctionData);
        await auction.save();
        
        // Save initial state to Redis
        await redisClient.set(getAuctionKey(auction._id), JSON.stringify(auction), { EX: 3600 });
        
        return res.status(201).json({ message: 'Auction created successfully', auction });
    } 
    catch (err) {
        console.error("Error creating auction:", err);
        throw new ApiError(500, "Error creating auction", err);
    }
});


export const getAuctionById = asyncHandler(async (req, res) => {
    const { auctionId } = req.params;

    if (!auctionId) {
        return res.status(400).json({ message: 'Auction ID is required' });
    }

    const cached = await redisClient.get(getAuctionKey(auctionId));
    if (cached) {
       return res.status(200).json({ message: 'Auction details fetched (cache)', auctionDetails: JSON.parse(cached) });
    }

    const auctionDetails = await Auction.findById(auctionId);
    if (!auctionDetails) {
        return res.status(404).json({ message: 'Auction not found' });
    }

    // Save in Redis for 1 hour
    await redisClient.set(getAuctionKey(auctionId), JSON.stringify(auctionDetails), { EX: 3600 });
    res.status(200).json({ message: 'Auction details fetched successfully', auctionDetails });
});


export const getAllAuctions = asyncHandler(async (req, res) => {
    const auctions = await Auction.find();
    if (!auctions || auctions.length === 0) {
        return res.status(404).json({ message: "No auctions found" });
    }
    res.status(200).json({ message: "All auctions fetched successfully", auctions });
});

export const getAllPlayers = async (req, res) => {
    const { id: auctionId } = req.params;
    
    try {   
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ message: "Auction not found" });
        }
        return res.status(200).json({ players: auction.players });
    } catch (err) {
        console.error("Error fetching players:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getTeamById = async (req, res) => {
    const { id: auctionId, teamId } = req.params;
    
    try{
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ message: "Auction not found" });
        }
        const team = auction.teams.find(t => t._id.toString() === teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }
        return res.status(200).json({ team });
    }
    catch(err){
        console.error("Error fetching team:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}


export const getAllTeams = async (req, res) => {
    const { id: auctionId } = req.params;
    try {
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ message: "Auction not found" });
        }
        return res.status(200).json({ teams: auction.teams });
    } catch (err) {
        console.error("Error fetching teams:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// RabbitMQ Consumer add registered player or team to auction
export const addPlayerOrTeamToAuction = async (data) => {
    const { eventId, role, userId, username, teamName } = data;
    
    if (!eventId || !role || !userId || !username) {
        throw new ApiError(400, "Missing required fields in message data");
    }
    
    const auction = await Auction.findOne({ eventId });
    if (!auction) {
        throw new ApiError(404, "Auction not found for given event ID");
    }
    
    if (role === 'player') {
        const newPlayer = {
            playerId: userId,
            playerName: username,
            teamName: 'N/A',
            finalBid: 0,
            bidStatus: 'available',
            currentStatus: 'inactive',
        };
    
        const alreadyExists = auction.players.some(p => p.playerId.toString() === userId);
        if (alreadyExists) {
            console.log(`Player with ID ${userId} already registered`);
            return;
        }
    
        auction.players.push(newPlayer);
        await auction.save();
        console.log(`✅ Player ${username} added to auction with event ID ${eventId}`);
    }
    
    else if (role === 'owner') {
        if (!teamName) {
            throw new ApiError(400, "Team name is required for owner registration");
        }
    
        const newTeam = {
            ownerId: userId,
            ownerName: username,
            teamName,
            players: [],
        };
    
        const alreadyExists = auction.teams.some(t => t.ownerId.toString() === userId);
        if (alreadyExists) {
            console.log(`⚠️ Owner with ID ${userId} already registered`);
            return;
        }
    
        auction.teams.push(newTeam);
        await auction.save();
        await redisClient.set(getAuctionKey(auction._id), JSON.stringify(auction), { EX: 3600 });
        console.log(`Owner ${username} with team "${teamName}" added to auction with event ID ${eventId}`);
    }
    
    else {
        throw new ApiError(400, "Invalid role type");
    }
};

// Existing finalizePlayerBid function
export const finalizePlayerBid = async (req, res) => {
    try {
        const { id: auctionId } = req.params;
        const { playerId, finalBid, teamName } = req.body;
    
        if (!auctionId || !playerId || finalBid == null || !teamName) {
            return res.status(400).json({ message: "Missing required fields" });
        }
    
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ message: "Auction not found" });
        }
    
        const player = auction.players.find(p => p.playerId === playerId);
        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }
    
        if (player.bidStatus === "bidded") {
            return res.status(400).json({ message: "Player already bidded" });
        }
    
        // Update player fields
        player.finalBid = finalBid;
        player.teamName = teamName;
        player.bidStatus = "bidded";
        player.currentStatus = "inactive";
    
        const team = auction.teams.find(t => t.teamName === teamName);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        team.players.push({
            playerId: player.playerId,
            playerName: player.playerName,
        });
        
        await auction.save();
        await redisClient.set(getAuctionKey(auction._id), JSON.stringify(auction), { EX: 3600 });
        
        // Emit socket event
        const io = req.io;
        io.to(auctionId).emit("playerBidFinalized", {
            auctionId,
            player,
            team,
            message: "Player bid finalized and added to team",
        })
    
        res.status(200).json({
            message: "Player bid finalized and added to team successfully",
            player,
            team,
        });
    } 
    catch (err) {
        console.error("Error finalizing bid:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
