import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import prisma from '../models/index.js';

export const VerifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json(new ApiError(401, "Access token missing"));
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await prisma.userProfile.findUnique({
      where: { id: decodedToken._id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json(new ApiError(401, "Access token expired"));
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json(new ApiError(401, "Invalid access token"));
    } else {
      return res.status(401).json(new ApiError(401, error.message || "Unauthorized"));
    }
  }
}); 
