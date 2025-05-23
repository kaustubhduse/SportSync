import axios from 'axios';
import { ApiError } from '../utils/ApiError.js';

export const getTeamDetails = async (auctionId, teamId, authorization) => {
  try {
    const response = await axios.get(
      `http://auction-service:5004/api/auctions/${auctionId}/${teamId}`,
      {
        headers: {
          Authorization: authorization,
        },    
      }
    );  

    if (!response.data?.team) {
      throw new ApiError(404, "Team not found");
    }

    console.log("Team response from auction-service:", response.data.team);

    return response.data.team;
  } 
  catch (err) {
    console.error("Error fetching team details:", err?.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || "Error fetching team details from auction-service"
    );
  }
};
