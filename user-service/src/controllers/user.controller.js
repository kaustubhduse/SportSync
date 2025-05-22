import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import prisma from "../models/index.js";


const createUserProfile = asyncHandler(async (req, res) => {
  try {
    
    const { id, name, email } = req.body;
    if (!id || !name || !email) {
      return res.status(400).json(
        new ApiError(400, "All fields (id, name, email) are required")
      );
    }

    const profile = await prisma.userProfile.create({
      data: {
        id,
        name,
        email,
        bio: "",
        avatar: "",
      },
    });

    return res.status(201).json(
      new ApiResponse(201, profile, "Profile created successfully")
    );

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json(
        new ApiError(409, "Profile already exists for this user")
      );
    }

    console.error("Profile creation error:", error);
    return res.status(500).json(
      new ApiError(500, "Internal server error while creating profile")
    );
  }
});


const getAllUsers = asyncHandler(async (req, res) => {
  const users = await prisma.userProfile.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (users.length === 0) {
    return res.status(404).json(new ApiError(404, "No users found"));
  }

  res.status(200).json(new ApiResponse(200, users, "Users fetched successfully"));
});



// Get Current User (Profile of the logged-in user)
const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.userProfile.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    return res.status(404).json(new ApiError(404, "User profile not found"));
  }

  return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});



// Get User by ID (from UserProfile table)
const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json(new ApiError(404, "User profile not found"));
  }

  return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});


// Update My Profile (bio and avatar)
const updateMyProfile = asyncHandler(async (req, res) => {
  const { bio, avatar } = req.body;

  const user = await prisma.userProfile.update({
    where: { id: req.user.id },
    data: {
      bio,
      avatar,
    },
  });

  if (!user) {
    return res.status(404).json(new ApiError(404, "User profile not found"));
  }

  return res.status(200).json(new ApiResponse(200, user, "User profile updated successfully"));
});


const deleteMyProfile = asyncHandler(async (req, res) => {
  const user = await prisma.userProfile.delete({
    where: { id: req.user.id },
  });

  if (!user) {
    return res.status(404).json(new ApiError(404, "User profile not found"));
  }

  return res.status(200).json(new ApiResponse(200, user, "User profile deleted successfully"));
});

export {createUserProfile, getAllUsers, getMe, getUserById, updateMyProfile, deleteMyProfile };
