import axios from 'axios';  
import { ApiError } from '../utils/ApiError.js';

export const getUsersByIds = async(userIds, authHeader) => {
    try {
        const response = await axios.post(
          "http://user-service:5002/api/v1/users/get-users",
          { userIds },
          { headers: { Authorization: authHeader } }
        );
    
        const apiResp = response.data;
    
        if (!Array.isArray(apiResp.data)) {
          console.error("Unexpected response shape from user-service:", apiResp);
          throw new ApiError(500, "Invalid response from user service");
        }
    
        return apiResp.data; // array of users
      } catch (err) {
        console.error(
          "Error fetching users from user-service:",
          err.response?.data || err.message
        );
        throw new ApiError(500, "Failed to fetch users from user service");
      } 
};

