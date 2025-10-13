// routes/auction.routes.js (UPDATED)
import express from 'express';
import { createAuction, finalizePlayerBid, getAllAuctions, getAllPlayers, getAllTeams, getAuctionById, getTeamById, placeAutoBid} from '../controllers/auction.controller.js'
import {VerifyJWT} from '../middlewares/auth.middleware.js';
import { getEventDetails } from '../cross-services/auction.cross-service.js';

const router = express.Router();

// route for placing an automatic bid
router.post('/:id/bid', VerifyJWT, placeAutoBid);

// Admin routes
router.post('/create', VerifyJWT, createAuction);

// User routes
router.get('/:id', VerifyJWT, getAuctionById);
router.get('/', VerifyJWT, getAllAuctions);
router.get('/:id/players', VerifyJWT, getAllPlayers); 
router.get('/:id/:teamId', VerifyJWT, getTeamById);
router.get('/:id/teams', VerifyJWT, getAllTeams);


router.put('/:id/finalize-bid', VerifyJWT, finalizePlayerBid);

router.get('/', VerifyJWT, getEventDetails);

export default router;