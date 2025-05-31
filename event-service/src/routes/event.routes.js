import express from 'express';
import {createEvent, getAllEvents, updateEvent, deleteEvent, registerForEvent, getEventOwners, getEventPlayers, getEventById} from '../controllers/event.controller.js';
import {VerifyJWT} from "../middlewares/auth.middleware.js"

const router = express.Router();

// Admin routes
router.route('/').post(VerifyJWT,createEvent);
router.route('/:id').put(VerifyJWT,updateEvent);
router.route('/:id').delete(VerifyJWT,deleteEvent);



// User routes
// Register for an event
router.route('/register/:id').post(VerifyJWT,registerForEvent);
router.route('/').get(VerifyJWT,getAllEvents);
router.route('/:id').get(VerifyJWT,getEventById); // Get a single event by ID


// Get all participants of an event(cross-service call to user service)
router.route('/owners/:id').get(VerifyJWT,getEventOwners); 
router.route('/players/:id').get(VerifyJWT,getEventPlayers);


export default router;
