import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app";

dotenv.config();

const DEFAULT_PORT = parseInt(process.env.PORT || "8080", 10);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in environment variables.");
  process.exit(1);
}

const startServer = async (port: number) => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to the database");

    const server = app.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} is in use. Trying port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error("Server error:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("Connection Failed!", error);
    process.exit(1);
  }
};

startServer(DEFAULT_PORT);
