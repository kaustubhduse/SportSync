// utils/redisClient.js
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
    url: REDIS_URL,
});

redisClient.on('error', (err) => console.error('❌ Redis error:', err));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('✅ Redis connected');
    } catch (err) {
        console.error('❌ Redis connection error:', err);
    }
};

export default redisClient;