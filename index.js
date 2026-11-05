
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const PORT = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

// MongoDB Connection
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

// Root Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Kindora server is running!",
  });
});

// JWT Verification Middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.CLIENT_URL) {
      throw new Error("CLIENT_URL is not configured.");
    }

    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    );

    const { payload } = await jwtVerify(token, JWKS);

    req.user = payload;

    return next();
  } catch (error) {
    console.error("JWT verification failed:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Create Event API (Protected)
app.post("/create-event", verifyToken, async (req, res) => {
  try {
    const event = req.body;

    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User not identified.",
      });
    }

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
      createdBy: userId,
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

// Upcoming Events API (Public)
app.get("/upcoming-events",verifyToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const collection = db.collection("events");

    const now = new Date();

    const events = await collection
      .find({
        startDate: { $gte: now.toISOString() },
      })
      .sort({ startDate: 1 })
      .toArray();

    return res.status(200).json(events);
  } catch (error) {
    console.error("Upcoming events error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming events",
    });
  }
});

// Get Event Details (Public)
app.get("/event/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID.",
      });
    }

    const db = await getDatabase();
    const collection = db.collection("events");

    const event = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error("Event details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch event details.",
    });
  }
});

// Local Development Server
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Kindora server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;
