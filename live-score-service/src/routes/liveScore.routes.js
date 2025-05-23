import express from 'express';
import { createMatch, getLiveScore, updateLiveScore } from '../controllers/liveScore.controller.js';
import { VerifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/create', VerifyJWT, createMatch);
router.get('/:id', VerifyJWT, getLiveScore);
router.put('/:id/update', VerifyJWT, updateLiveScore);

export default router;