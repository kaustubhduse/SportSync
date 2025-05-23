import Match from '../models/match.model.js';
import redisClient from '../utils/redisClient.js';
import { io } from '../utils/socket.js';
import { getTeamDetails } from '../cross-services/get-team-details.js';

export const createMatch = async (req, res) => {
  try {
    
    const {
      eventId,
      auctionId,
      team1Name,
      team1Id,
      team2Name,
      team2Id,
      matchno,
      matchTitle,
      matchType,
      startTime,
      endTime,
    } = req.body;

    if (!team1Name || !team2Name || !team1Id || !team2Id) {
      return res.status(400).json({ message: "Both team1 and team2 are required." });
    }

    const team1 = await getTeamDetails(auctionId, team1Id, req.headers.authorization);
    const team2 = await getTeamDetails(auctionId, team2Id, req.headers.authorization);

    const MatchData = {
      eventId,
      matchno,
      matchTitle,
      matchType,
      startTime,
      endTime,
      teams: [
        {
          teamId: team1Id,
          teamName: team1Name,
          players: team1.players,
        },
        {
          teamName: team2Name,
          teamId: team2Id,
          players: team2.players,
        },
      ],
    }
    const match = await Match.create(MatchData);

    return res.status(201).json({ message: "Match created successfully", match });
  } catch (err) {
    console.error("Error creating match:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};



export const updateLiveScore = async (req, res) => {
  try {
    const { id: matchId } = req.params;
    const {
      score,
      wickets,
      overs,
      newBatsman,
      newBowler,
      ballData, // Optional: ball-by-ball update
    } = req.body;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const inningsKey = match.currentInnings === 1 ? "firstInnings" : "secondInnings";
    const innings = match[inningsKey];

    // --- Basic stat updates
    if (typeof score === "number") innings.totalRuns = score;
    if (typeof wickets === "number") innings.totalWickets = wickets;
    if (typeof overs === "number") innings.overs = overs;

    // --- New batsman update
    if (newBatsman?.id && newBatsman?.name) {
      const alreadyPresent = innings.currentBatsmen.some(p => p.playerId === newBatsman.id);
      if (!alreadyPresent && innings.currentBatsmen.length < 2) {
        innings.currentBatsmen.push({
          playerId: newBatsman.id,
          playerName: newBatsman.name,
        });

        // Add to batting array if not already present
        const existsInBatting = innings.batting.some(p => p.playerId === newBatsman.id);
        if (!existsInBatting) {
          innings.batting.push({
            playerId: newBatsman.id,
            playerName: newBatsman.name,
          });
        }
      }
    }

    // --- New bowler update
    if (newBowler?.id && newBowler?.name) {
      innings.currentBowler = {
        playerId: newBowler.id,
        playerName: newBowler.name,
      };

      // Add to bowling if not already present
      const existsInBowling = innings.bowling.some(p => p.playerId === newBowler.id);
      if (!existsInBowling) {
        innings.bowling.push({
          playerId: newBowler.id,
          playerName: newBowler.name,
        });
      }
    }

    // --- Ball-by-ball update
    if (ballData) {
      const { batsmanId, runsScored = 0, isBoundary, isSix, isWicket, bowlerId, extras = 0 } = ballData;

      // Update batsman stats
      const batsman = innings.batting.find(p => p.playerId === batsmanId);
      if (batsman) {
        batsman.runs += runsScored;
        batsman.ballsFaced += 1;
        if (isBoundary) batsman.fours += 1;
        if (isSix) batsman.sixes += 1;
        if (isWicket) {
          batsman.out = true;
          innings.currentBatsmen = innings.currentBatsmen.filter(p => p.playerId !== batsmanId);
        }
      }

      // Update bowler stats
      const bowler = innings.bowling.find(p => p.playerId === bowlerId);
      if (bowler) {
        bowler.runsConceded += runsScored + extras;
        if (isWicket) bowler.wickets += 1;

        // Increment overs (6 balls = 1 over)
        bowler.overs += 1 / 6;
      }
    }

    await match.save();

    const liveData = {
      matchId,
      innings: match.currentInnings,
      score: innings.totalRuns,
      wickets: innings.totalWickets,
      overs: innings.overs,
      currentBatsmen: innings.currentBatsmen,
      currentBowler: innings.currentBowler,
      battingStats: innings.batting,
      bowlingStats: innings.bowling,
    };

    // Cache in Redis and emit via Socket.IO
    await redisClient.set(`live-score:${matchId}`, JSON.stringify(liveData));
    io.emit("live-score-update", liveData);

    res.status(200).json({ message: "Live score updated successfully", data: liveData });
  } catch (err) {
    console.error("Error updating score:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const getLiveScore = async (req, res) => {
  try {
    const { id: matchId } = req.params;

    if (!matchId) {
      return res.status(400).json({ message: 'Match ID is required' });
    }

    // Check Redis cache
    const cached = await redisClient.get(`live-score:${matchId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      return res.status(200).json({
        success: true,
        source: 'cache',
        data: parsed,
      });
    }

    // Fetch from DB
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const liveData = {
      matchId,
      score: match.score,
      wickets: match.wickets,
      overs: match.overs,
    };

    // Cache result in Redis for 30 seconds
    await redisClient.set(`live-score:${matchId}`, JSON.stringify(liveData), 'EX', 30);

    return res.status(200).json({
      success: true,
      source: 'database',
      data: liveData,
    });
  } catch (err) {
    console.error('Error fetching live score:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

