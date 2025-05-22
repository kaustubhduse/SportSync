import dotenv from "dotenv";
dotenv.config();

export const {
  PORT,
  ACCESS_TOKEN_SECRET,
  DATABASE_URL
} = process.env;
