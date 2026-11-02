import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import "dotenv/config";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

// MongoDB connection
let client;
let clientPromise;

const getDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
  }

  if (!clientPromise) {
    clientPromise = client.connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  await clientPromise;

  return client.db("kindora");
};

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Kindora server is running!",
  });
});

// Create Event API
app.post("/create-event", async (req, res) => {
  try {
    const event = req.body;

    if (
      !event ||
      typeof event !== "object" ||
      Array.isArray(event) ||
      Object.keys(event).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid event data is required.",
      });
    }

    const db = await getDatabase();
    const collection = db.collection("events");

    const now = new Date();

    const result = await collection.insertOne({
      ...event,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Create event error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error. Failed to create event.",
    });
  }
});

// Upcoming Events API
app.get("/upcoming-events", async (req, res) => {
  try {
    const db = await getDatabase();
    const collection = db.collection("events");

    const result = await collection.find().toArray();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Upcoming events error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming events.",
    });
  }
});

// Export app for Vercel
export default app;
