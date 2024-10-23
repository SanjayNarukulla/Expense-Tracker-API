// db.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI; // Use your connection string here

const client = new MongoClient(uri); // Removed deprecated options

const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

const getDb = () => {
  return client.db("expense_tracker"); // Replace with your database name
};

module.exports = {
  connectToDatabase,
  getDb,
};
