  import asyncHandler from "../utils/asyncHandler.js";
  import { ApiError } from "../utils/ApiError.js";
  import ApiResponse from "../utils/ApiResponse.js";
  import jwt from "jsonwebtoken";
  import prisma from "../models/index.js";
  import bcrypt from "bcryptjs";
  import { registerUserService } from "../services/auth.service.js";
  import passport from "passport";

  // Generate Access Token
  const generateToken = (user) => {
    return jwt.sign(
      { _id: user.id, name: user.name },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
  };

  // Generate Refresh Token
  const generateRefreshToken = (user) => {
    return jwt.sign(
      { _id: user.id, name: user.name },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
  };

  const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshToken = req.headers["refresh_token"]?.replace("Bearer ", "");

    if (!refreshToken) {
      return res.status(402).json(new ApiError(402, "Unauthorized"));
    }

    try {
      const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

      const user = await prisma.user.findUnique({
        where: { id: decodedToken?._id },
        select: { id: true, email: true, refreshToken: true, createdAt: true, updatedAt: true },
      });

      if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }

      if (user?.refreshToken !== refreshToken) {
        return res.status(402).json(new ApiError(402, "Refresh Token Expired"));
      }

      const { accessToken, refreshTokens } = await generateRefreshTokenAndAccessToken(user.id);

      return res
        .status(200)
        .json(new ApiResponse(200, { accessToken, refreshTokens }, "Token refreshed successfully"));
    } catch (error) {
      return res.status(402).json(new ApiError(401, error?.message || "Invalid Refresh Token"));
    }
  });

  const generateRefreshTokenAndAccessToken = async (userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }

      const refreshTokens = generateRefreshToken(user);
      const accessToken = generateToken(user);
      user.refreshToken = refreshTokens;

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: refreshTokens },
      });

      return { refreshTokens, accessToken };
    } catch (error) {
      return res.status(500).json(new ApiError(500, "Error generating tokens"));
    }
  };
  
  const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json(new ApiError(400, "All fields are required"));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json(new ApiError(400, "Email already in use"));
    }

    const hashedPassword = await bcrypt.hash(password, 10); // saltRounds = 10

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
    
    registerUserService(user); 

    const { password: _p, refreshToken: _r, ...userSafe } = user;

    res.status(201).json({
      status: 201,
      data: userSafe,
      message: "User registered successfully",
    })
  });
  
  
  const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(new ApiError(400, "Email and password are required"));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json(new ApiError(401, "Invalid credentials"));
    }

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    const options = { httpOnly: true, secure: true };
    const { password: _p, refreshToken: _r, ...userResponse } = user;
     
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(200, { user: userResponse, accessToken, refreshToken }, "Login successful")
      );
  });
      
  const logoutUser = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }
  
    if (!user.refreshToken) {
      // Clear cookies even if already logged out, for safety
      return res
        .status(400)
        .clearCookie("accessToken", { httpOnly: true, secure: true, sameSite: "strict" })
        .clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "strict" })
        .json(new ApiError(400, "User already logged out"));
    }
  
    // Set refresh token to null in DB
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });
  
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      expires: new Date(0), // Expire immediately
    };
  
    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, {}, "User logged out"));
  });
  
  
  const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json(new ApiError(400, "Old password and new password are required"));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json(new ApiError(404, "User not found"));

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(402).json(new ApiError(402, "Invalid credentials"));

    const hashedNew = await bcrypt.hash(newPassword, 10); // 10 is a good default saltRounds

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNew },
    });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
  });


  
// Google OAuth callback handler
const googleOAuthCallback = asyncHandler(async (req, res) => {
  // req.user will be populated by passport Google strategy on success
  const googleUser = req.user;

  if (!googleUser) {
    return res.status(401).json(new ApiError(401, "Google authentication failed"));
  }

  // Try to find user in DB by Google ID or email
  let user = await prisma.user.findUnique({
    where: { email: googleUser.email },
  });

  if (!user) {
    // If user doesn't exist, create new user
    user = await prisma.user.create({
      data: {
        name: googleUser.displayName || "Google User",
        email: googleUser.email,
        password: "",
       
      },
    });
  }

  // Generate tokens
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Save refresh token to DB
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  const options = { httpOnly: true, secure: true, sameSite: "strict" };

  const { password: _p, refreshToken: _r, ...userSafe } = user;

  // Set tokens as cookies and respond
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { user: userSafe, accessToken, refreshToken }, "Google OAuth login successful"));
});

// Google OAuth failure handler
const googleOAuthFailure = (req, res) => {
  return res.status(401).json(new ApiError(401, "Google OAuth authentication failed"));
};
  

  export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    googleOAuthCallback,
    googleOAuthFailure,
  };
