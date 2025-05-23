import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Auction from '../models/auction.model.js';
import { getEventDetails } from '../cross-services/auction.cross-service.js';

export const createAuction = asyncHandler(async (req, res) => {
    try {
      const { eventId, auctionDate, auctionTime, auctionLocation } = req.body;
  
      if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required' });
      }
  
      // Fetch event details from the event service
      const eventDetails = await getEventDetails(eventId, req.headers.authorization);
      // Validate event response structure
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
      };
  
      const auction = new Auction(auctionData);
      await auction.save();
  
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
    // Fetch auction details from database (mocked here)
    const auctionDetails = await Auction.findById(auctionId);
    if (!auctionDetails) {
        return res.status(404).json({ message: 'Auction not found' });
    }
    res.status(200).json({ message: 'Auction details fetched successfully', auctionDetails });

});


export const getAllAuctions = asyncHandler(async (req, res) => {
    const auctions = await Auction.find();
    if (!auctions || auctions.length === 0) {
        return res.status(404).json({ message: 'No auctions found' });
    }
    res.status(200).json({ message: 'All auctions fetched successfully', auctions });
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

// Get all teams from a specific auction
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
      console.log(`✅ Owner ${username} with team "${teamName}" added to auction with event ID ${eventId}`);
    }
  
    else {
      throw new ApiError(400, "Invalid role type");
    }
  };
  
  
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
  