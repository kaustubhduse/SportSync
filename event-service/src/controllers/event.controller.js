import Event, { CategoryEnum } from '../models/event.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import {getUsersByIds} from '../cross-services/event.cross-service.js';
import { publishMessage } from '../rabbitmq/rabbitmq.publisher.js';

// Register for an event
export const registerForEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user._id;
  const { role } = req.body;

  if (!["player", "owner"].includes(role)) {
    throw new ApiError(400, "Role must be either 'player' or 'owner'");
  }

  let teamName;
  if (role === 'owner') {
    teamName = req.body.teamName;
    if (!teamName || teamName.trim() === "") {
      throw new ApiError(400, "Team name is required for owners");
    }
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const alreadyRegistered = event.participants.some(
    (participant) => participant.userId === userId.toString()
  );
  if (alreadyRegistered) {
    throw new ApiError(400, "User already registered for this event");
  }

  const owners = event.participants.filter(p => p.role === 'owner');
  const players = event.participants.filter(p => p.role === 'player');

  if (role === 'owner') {
    if (owners.length >= event.maxTeams) {
      throw new ApiError(400, `Max number of owners (${event.maxTeams}) already registered`);
    }

    const isTeamNameTaken = owners.some(
      (owner) => owner.teamName?.toLowerCase() === teamName.trim().toLowerCase()
    );
    if (isTeamNameTaken) {
      throw new ApiError(400, "Team name is already taken for this event");
    }
  }

  if (
    role === 'player' &&
    players.length >= event.maxTeams * event.maxPlayersPerTeam
  ) {
    throw new ApiError(
      400,
      `Max players limit (${event.maxTeams * event.maxPlayersPerTeam}) reached`
    );
  }

  const users = await getUsersByIds([userId], req.headers.authorization);
  if (!users || !Array.isArray(users) || users.length === 0) {
    throw new ApiError(500, "User not found in user service");
  }

  const username = users[0].name;

  const participant = {
    userId: userId.toString(),
    username,
    role,
    status: 'pending',
    joinedAt: new Date(),
  };

  if (role === 'owner') {
    participant.teamName = teamName.trim();
  }

  event.participants.push(participant);
  await event.save();

  const messagePayload = {
    eventId: event._id,
    userId: userId,
    username,
    role,
    status: 'pending',
  };

  if (role === 'owner') {
    messagePayload.teamName = teamName.trim();
  }

  await publishMessage("auction-queue", messagePayload);

  return res.status(200).json(
    new ApiResponse(200, event, "User registered for the event successfully")
  );
});




export const getEventOwners = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const owners = event.participants.filter(p => p.role === 'owner');

  const missingOwnerIds = owners
    .filter(p => !p.username)
    .map(p => p.userId);

  if (missingOwnerIds.length > 0) {
    const fetchedUsers = await getUsersByIds(missingOwnerIds, req.headers.authorization);

    const usersMap = {};
    fetchedUsers.forEach(u => {
      usersMap[u.id] = u.name;
    });

    event.participants.forEach(p => {
      if (p.role === 'owner' && !p.username && usersMap[p.userId]) {
        p.username = usersMap[p.userId];
      }
    });

    await event.save(); // update DB with names
  }

  const detailedOwners = owners.map(p => ({
    userId: p.userId,
    name: p.username || "Unknown",
    teamName: p.teamName || "N/A",
    joinedAt: p.joinedAt,
    status: p.status,
    role: p.role,
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

  const participants = event.participants;

  // Find participants with missing usernames
  const missingUserIds = participants
    .filter(p => !p.username)
    .map(p => p.userId);

  if (missingUserIds.length > 0) {
    const fetchedUsers = await getUsersByIds(missingUserIds, req.headers.authorization);

    const usersMap = {};
    fetchedUsers.forEach(u => {
      usersMap[u.id] = u.name;
    });

    // Update event document with fetched names
    event.participants.forEach(p => {
      if (!p.username && usersMap[p.userId]) {
        p.username = usersMap[p.userId];
      }
    });

    await event.save(); // save updated usernames
  }

  // Prepare final response from stored data
  const detailedPlayers = participants.map(p => ({
    userId: p.userId,
    name: p.username || "Unknown",
    joinedAt: p.joinedAt,
    status: p.status,
    role: p.role,
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
    throw new ApiError(400, `Invalid category. Valid options are: ${CategoryEnum.join(', ')}`);
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


// Get an event by ID
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
