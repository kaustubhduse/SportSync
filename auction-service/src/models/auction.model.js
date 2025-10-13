// models/auction.model.js
import mongoose from "mongoose";

export const CategoryEnum = [
  "cricket",
  "football",
  "badminton",
  "volleyball",
  "other",
];

// Player schema used in Auction.players
const playerSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      required: true,
      ref: "User",
    },
    playerName: {
      type: String,
      required: true,
    },
    teamName: {
      type: String,
      required: true,
      default: "N/A",
    },
    finalBid: {
      type: Number,
      required: true,
      default: 0,
    },
    bidStatus: {
      type: String,
      required: true,
      enum: ["available", "bidded"],
      default: "available",
    },
    currentStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
  },
  { _id: false }
);

// Team player schema for teamSchema.players array (with _id disabled)
const teamPlayerSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      required: true,
      ref: "User",
    },
    playerName: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Team schema for Auction.teams
const teamSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true,
    ref: "User",
  },
  ownerName: {
    type: String,
    required: true,
  },
  teamName: {
    type: String,
    required: true,
  },
  players: [teamPlayerSchema], // corrected
});

// Main auction schema
const auctionSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Event",
    },
    eventCategory: {
      type: String,
      required: true,
      enum: CategoryEnum,
    },
    eventName: {
      type: String,
      required: true,
    },
    eventDescription: {
      type: String,
      required: true,
    },
    auctionDate: {
      type: Date,
      required: true,
    },
    auctionTime: {
      type: String,
      required: true,
    },
    auctionLocation: {
      type: String,
      required: true,
    }, // --- NEW FIELDS FOR LIVE BIDDING ---
    currentBid: {
      type: Number,
      required: true,
      default: 0,
    },
    currentBidderId: {
      type: String,
      default: null,
      ref: "User",
    },
    currentBidderName: {
      type: String,
      default: null,
    }, // -----------------------------------
    players: [playerSchema],
    teams: [teamSchema],
  },
  { timestamps: true }
);

const Auction = mongoose.model("Auction", auctionSchema);
export default Auction;
