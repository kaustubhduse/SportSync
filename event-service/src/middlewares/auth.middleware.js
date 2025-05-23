import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

export const VerifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json(new ApiError(401, "Access token missing"));
    }

    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      // Attach decoded token to request (you only need the ID for now)
      // console.log("Decoded token:", decodedToken); 
      // console.log(decodedToken._id);
      req.user = decodedToken;  
      // console.log("User ID from token:", decodedToken._id);

      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json(new ApiError(401, "Access token expired"));
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json(new ApiError(401, "Invalid access token"));
      } else {
        return res.status(500).json(new ApiError(500, error.message || "Internal Server Error"));
      }
    }
  } catch (error) {
    next(new ApiError(401, error.message || "Unauthorized"));
  }
}); 
