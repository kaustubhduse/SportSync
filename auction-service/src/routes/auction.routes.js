import express from 'express';
import { createAuction, finalizePlayerBid, getAllAuctions, getAllPlayers, getAllTeams, getAuctionById, getTeamById} from '../controllers/auction.controller.js'
import {VerifyJWT} from '../middlewares/auth.middleware.js';
import { getEventDetails } from '../cross-services/auction.cross-service.js';

const router = express.Router();

router.post('/create', VerifyJWT, createAuction);
router.get('/:id', VerifyJWT, getAuctionById);
router.get('/', VerifyJWT, getAllAuctions);
router.get('/:id/players', VerifyJWT, getAllPlayers); 
router.get('/:id/:teamId', VerifyJWT, getTeamById);
router.get('/:id/teams', VerifyJWT, getAllTeams);


router.put('/:id/finalize-bid', VerifyJWT, finalizePlayerBid);

// cross-service routes
// 1- Get event details
router.get('/', VerifyJWT, getEventDetails);



export default router;
