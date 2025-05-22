import prisma from "../models/index.js";
import axios from "axios";

export const registerUserService = async (user) => {
  const userObject = {
    id: user.id,
    name: user.name,
    email: user.email,
  }
  console.log("User Object:", userObject);
   
  try {
    const response = await axios.post(
      'http://user-service:5002/api/v1/users/create-profile',
      {
        id: userObject.id,
        name: userObject.name,
        email: userObject.email,
      },
      {
        headers: {
          //Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error sending userId to user-service:", error?.response?.data || error.message);
    throw new Error("Failed to send userId to user-service");
  }
};
