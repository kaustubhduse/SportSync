import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import http from 'http';
import dotenv from 'dotenv';

import { initSocket } from './utils/socket.js';
import { connectRedis } from './utils/redisClient.js'; 
import { connectProducer } from './kafka/producer.js'; 
import { connectConsumer } from './kafka/consumer.js';
import liveScoreRoutes from './routes/liveScore.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

initSocket(server);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/live-score', liveScoreRoutes);

app.get('/', (req, res) => {
    res.send('Live-score service is running');
});

const PORT = process.env.PORT || 5006;
const MONGO_URI = process.env.MONGO_URI;

const startServer = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected');

        await connectRedis(); 

        await connectProducer();
        await connectConsumer(); 

        server.listen(PORT, () => {
            console.log(`Live-score service running on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Failed to start Live-score Service:', err.message);
        process.exit(1); 
    }
};

startServer();