require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // Import bcrypt for password hashing
const { connectToDatabase, getDb } = require("./db"); // Import getDb
const { createUser, findUserByUsername } = require("./user");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const jwtSecret = process.env.JWT_SECRET;

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const token = req.headers["authorization"];
  if (token) {
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        return res.sendStatus(403); // Forbidden
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized
  }
};

// User Registration
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userId = await createUser(username, password);
    res.status(201).json({ id: userId, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await findUserByUsername(username);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user._id, username: user.username }, jwtSecret, {
    expiresIn: "1h",
  });
  res.json({ auth: true, token });
});

// Example Transactions Route
app.post("/transactions", authenticateJWT, async (req, res) => {
  const { type, category, amount, date, description } = req.body;
  const db = getDb();

  try {
    const result = await db.collection("transactions").insertOne({
      type,
      category,
      amount,
      date,
      description,
      userId: req.user.id, // Get user ID from token
    });
    res.status(201).json({ id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Additional route to get user transactions
app.get("/transactions", authenticateJWT, async (req, res) => {
  const db = getDb();
  try {
    const transactions = await db
      .collection("transactions")
      .find({ userId: req.user.id })
      .toArray();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example route for transaction summaries
app.get("/summary", authenticateJWT, async (req, res) => {
  const db = getDb();
  try {
    const transactions = await db
      .collection("transactions")
      .find({ userId: req.user.id })
      .toArray();

    // Summarize transactions by type
    const summary = transactions.reduce((acc, transaction) => {
      acc[transaction.type] = (acc[transaction.type] || 0) + transaction.amount;
      return acc;
    }, {});

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server after connecting to the database
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectToDatabase(); // Connect to MongoDB before starting the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1); // Exit the process if the database connection fails
  }
};

startServer();
