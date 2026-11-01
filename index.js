
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import "dotenv/config";

// Express setup
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  })
);
app.use(express.json());

// MongoDB setup
const client = new MongoClient(process.env.MONGODB_URI);

let db;

const connectToMongoDB = async () => {
  await client.connect();

  db = client.db("kindora");

  console.log("Successfully connected to MongoDB!");
};

// Root route
app.get("/", (req, res) => {
  res.status(200).send({
    success: true,
    message: "Kindora server is running!",
  });
});

// Create Event API
app.post("/create-event", async (req, res) => {
  try {
    // 1. Receive data
    const event = req.body;

    // 2. Validate request body
    if (
      !event ||
      typeof event !== "object" ||
      Array.isArray(event) ||
      Object.keys(event).length === 0
    ) {
      return res.status(400).send({
        success: false,
        message: "Valid event data is required.",
      });
    }

    // 3. Select collection
    const collection = db.collection("events");

    // 4. Insert document
    const result = await collection.insertOne({
      ...event,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Send success response
    return res.status(201).send({
      success: true,
      message: "Event created successfully!",
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.error("Create event error:", error);

    return res.status(500).send({
      success: false,
      message: "Internal server error. Failed to create event.",
    });
  }
});

app.get("/upcoming-events",async(req, res) => {
  const collection = db.collection("events");
  const result = await collection.find().toArray();
  res.send(result)
})

// Start server
const startServer = async () => {
  try {
    await connectToMongoDB();

    app.listen(port, () => {
      console.log(`Kindora server is running on port: ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);

    await client.close().catch(() => {});

    process.exit(1);
  }
};

startServer();
