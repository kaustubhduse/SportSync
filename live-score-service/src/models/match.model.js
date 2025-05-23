import mongoose from "mongoose";

// Player schema used inside teams and stats
const playerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
  },
  playerName: {
    type: String,
    required: true,
  },
}, { _id: false });

// Team schema containing team info and its players
const teamSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
  },
  teamName: {
    type: String,
    required: true,
  },
  players: {
    type: [playerSchema],
    validate: [arr => arr.length > 0, 'Each team must have players'],
  },
}, { _id: false });

// Innings cricket stats schema
const cricketStatsSchema = new mongoose.Schema({
  batting: [
    {
      playerId: String,
      playerName: String,
      runs: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      out: { type: Boolean, default: false },
    },
  ],
  bowling: [
    {
      playerId: String,
      playerName: String,
      overs: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
    },
  ],
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },

  // 🔄 Updated to store full player info for live tracking
  currentBatsmen: {
    type: [playerSchema],
    default: [],
    validate: [arr => arr.length <= 2, 'Maximum 2 batsmen allowed'],
  },
  currentBowler: {
    type: playerSchema,
    default: null,
  },
}, { _id: false });

// Match schema
const matchSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      ref: "Event",
    },
    matchno: {
      type: Number,
      required: true,
    },
    matchTitle: {
      type: String,
      required: true,
    },
    matchType: {
      type: String,
      enum: ["T20", "ODI", "Test"],
      default: "T20",
    },
    status: {
      type: String,
      enum: ["not_started", "live", "paused", "finished"],
      default: "not_started",
    },
    startTime: Date,
    endTime: Date,
    teams: {
      type: [teamSchema],
      validate: {
        validator: (val) => val.length === 2,
        message: "Match must have exactly two teams.",
      },
    },
    firstInnings: {
      type: cricketStatsSchema,
      default: () => ({}),
    },
    secondInnings: {
      type: cricketStatsSchema,
      default: () => ({}),
    },
    currentInnings: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Match", matchSchema);
export { playerSchema, teamSchema, cricketStatsSchema };
