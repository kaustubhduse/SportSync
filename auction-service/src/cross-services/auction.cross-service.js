import axios from "axios";
import { ApiError } from "../utils/ApiError.js";

export const getEventDetails = async (eventId, authorization) => {
  try{
    const eventDetails = await axios.get(
        `http://event-service:5003/api/event/${eventId}`,
        {
          headers: {
            Authorization: authorization,
          },    
        }
      );
      const event = eventDetails.data;
      if (!event) {
        throw new ApiError(404, "Event not found", null);   
      }
      return event;
  }
    catch (err) {
        console.error("Event not found:", err);
        throw new ApiError(500, "Error fetching event", err);
    }
};
