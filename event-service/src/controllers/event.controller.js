import Event, { CategoryEnum } from '../models/event.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import {getUsersByIds} from '../cross-services/event.cross-service.js';

// Register for an event
export const registerForEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user._id;
  const { role } = req.body;

  if (!["player", "owner"].includes(role)) {
    throw new ApiError(400, "Role must be either 'player' or 'owner'");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  // Check if already registered
  const alreadyRegistered = event.participants.some(
    (participant) => participant.userId === userId.toString()
  );
  if (alreadyRegistered) {
    throw new ApiError(400, "User already registered for this event");
  }

  // Limit checks
  const owners = event.participants.filter(p => p.role === 'owner');
  const players = event.participants.filter(p => p.role === 'player');

  if (role === 'owner' && owners.length >= event.maxTeams) {
    throw new ApiError(400, Max number of owners (${event.maxTeams}) already registered);
  }

  if (
    role === 'player' &&
    players.length >= event.maxTeams * event.maxPlayersPerTeam
  ) {
    throw new ApiError(
      400,
      Max players limit (${event.maxTeams * event.maxPlayersPerTeam}) reached
    );
  }

  // Add to participants
  event.participants.push({
    userId: userId.toString(),
    role,
    status: 'pending',
    joinedAt: new Date(),
  });

  await event.save();

  return res.status(200).json(
    new ApiResponse(200, event, "User registered for the event successfully")
  );
});



// Get owners of an event
export const getEventOwners = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  
  const owners = event.participants.filter(p => p.role === 'owner');
  const ownerIds = owners.map(p => p.userId);
   
  const usersArray = await getUsersByIds(ownerIds, req.headers.authorization);
  
  if (!Array.isArray(usersArray)) {
    console.error("Unexpected response shape from user-service:", apiResp);
    throw new ApiError(500, "Invalid response from user service");
  }
  
  const userMap = {};
  usersArray.forEach(user => {
    userMap[user.id] = user.name;
  });
  
  const detailedOwners = owners.map(p => ({
    userId: p.userId,
    name: userMap[p.userId] || "Unknown",
    joinedAt: p.joinedAt,
    status: p.status,
    role: p.role
  }));
  
  return res.status(200).json(
    new ApiResponse(200, detailedOwners, "Event owners fetched successfully")
  );
});



// Get players of an event
export const getEventPlayers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const players = event.participants.filter(p => p.role === 'player');
  const playerIds = players.map(p => p.userId);

  // Cross-service call to user-service
  const usersArray = await getUsersByIds(playerIds, req.headers.authorization);

  if (!Array.isArray(usersArray)) {
    console.error("Unexpected response shape from user-service:", apiResp);
    throw new ApiError(500, "Invalid response from user service");
  }

  const userMap = {};
  usersArray.forEach(user => {
    userMap[user.id] = user.name;
  });

  const detailedPlayers = players.map(p => ({
    userId: p.userId,
    name: userMap[p.userId] || "Unknown",
    joinedAt: p.joinedAt,
    status: p.status,
    role: p.role
  }));

  return res.status(200).json(
    new ApiResponse(200, detailedPlayers, "Event players fetched successfully")
  );
});



// Create a new event
export const createEvent = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    date,
    location,
    maxTeams,
    maxPlayersPerTeam
  } = req.body;

  if (!name || !category || !date || !location || !maxTeams || !maxPlayersPerTeam) {
    throw new ApiError(400, 'All required fields must be provided');
  }

  if (!CategoryEnum.includes(category)) {
    throw new ApiError(400, Invalid category. Valid options are: ${CategoryEnum.join(', ')});
  }

  const newEvent = await Event.create({
    name,
    description,
    category,
    date,
    location,
    maxTeams,
    maxPlayersPerTeam,
    createdBy: req.user._id, // Changed from name to _id for consistency
  });

  return res.status(201).json(
    new ApiResponse(201, newEvent, 'Event created successfully')
  );
});



// Get all events
export const getAllEvents = asyncHandler(async (req, res) => {
  const events = await Event.find();
  return res.status(200).json(
    new ApiResponse(200, events, "All events fetched successfully")
  );
});

// Get a single event by ID
export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  return res.status(200).json(
    new ApiResponse(200, event, "Event fetched successfully")
  );
});



// Update an event by ID
export const updateEvent = asyncHandler(async (req, res) => {
  const updatedEvent = await Event.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!updatedEvent) {
    throw new ApiError(404, "Event not found");
  }
  return res.status(200).json(
    new ApiResponse(200, updatedEvent, "Event updated successfully")
  );
});



// Delete an event by ID
export const deleteEvent = asyncHandler(async (req, res) => {
  const deletedEvent = await Event.findByIdAndDelete(req.params.id);
  if (!deletedEvent) {
    throw new ApiError(404, "Event not found");
  }
  return res.status(200).json(
    new ApiResponse(200, null, "Event deleted successfully")
  );
});