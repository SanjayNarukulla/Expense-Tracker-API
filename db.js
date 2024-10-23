const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI; // Ensure this has the correct connection string
const client = new MongoClient(uri);
let dbInstance;

const connectToDatabase = async () => {
  try {
    await client.connect();
    dbInstance = client.db("expense-tracker"); // Make sure this is your actual database name
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error("Failed to connect to the database."); // Throw error for better handling
  }
};

const getDb = () => {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call connectToDatabase first.");
  }
  return dbInstance;
};

// Ensure to close the client connection when the application exits
const closeConnection = async () => {
  try {
    await client.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
  }
};

module.exports = {
  connectToDatabase,
  getDb,
  closeConnection,
};
