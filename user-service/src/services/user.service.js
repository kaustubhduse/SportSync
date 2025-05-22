import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import prisma from "../models/index.js";

export const getBulkUsersById = asyncHandler(async (req, res) => {
    try {
        // Extract userIds from the request body
        const { userIds } = req.body;

        // Ensure userIds is an array
        if (!Array.isArray(userIds)) {
            console.error("Invalid userIds format: expected an array");
            throw new ApiError(400, "userIds must be an array");
        }

        // Check if userIds array is not empty
        if (userIds.length === 0) {
            console.warn("Empty userIds array");
            throw new ApiError(400, "userIds array cannot be empty");
        }

        // Fetch users from the database using Prisma
        const users = await prisma.userProfile.findMany({
            where: {
                id: {
                    in: userIds,
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        // If no users are found
        if (users.length === 0) {
            console.warn(`No users found for the given userIds: ${userIds}`);
            return res.status(404).json(new ApiError(404, "No users found"));
        }

        // Return the users data in the response
        return res.status(200).json(
            new ApiResponse(200, users, "Users fetched successfully")
        );

    } catch (error) {
        // Log the error and send a proper response
        console.error("Error fetching users:", error);
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json(error);
        } else {
            return res.status(500).json(new ApiError(500, "Internal Server Error"));
        }
    }
});
