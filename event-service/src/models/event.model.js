import mongoose from "mongoose";

export const CategoryEnum = [
  "cricket",
  "football",
  "badminton",
  "volleyball",
  "other",
];

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      required: [true, "Event category is required"],
      enum: CategoryEnum,
      default: "other",
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    location: {
      type: String,
      required: [true, "Event location is required"],
    },
    createdBy: {
      type: String, // User ID of the creator
      required: [true, "CreatedBy userId is required"],
    },
    maxTeams: {
      type: Number,
      required: [true, "Maximum number of teams is required"],
      min: 1,
    },
    maxPlayersPerTeam: {
      type: Number,
      required: [true, "Maximum players per team is required"],
      min: 1,
    },
    participants: [
      {
        _id: false, 
        userId: {
          type: String,
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ["player", "owner"],
          required: true,
        },
        teamName: {
          type: String,
          required: function () {
            return this.role === "owner";
          },
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["confirmed", "pending", "rejected"],
          default: "pending",
        },
      }
    ],
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
