require("dotenv").config();
const jwtSecret = process.env.JWT_SECRET;
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

// Utility function to handle SQL queries
const runQuery = (query, params, res) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject({ status: 500, message: err.message });
      } else {
        resolve(this);
      }
    });
  });
};

// User Registration
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  const query = "INSERT INTO users (username, password) VALUES (?, ?)";
  try {
    const result = await runQuery(query, [username, hashedPassword]);
    res.status(201).json({ id: result.lastID, username });
  } catch (error) {
    res.status(error.status).json({ error: error.message });
  }
});

// User Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err || !row) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = bcrypt.compareSync(password, row.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: row.id, username: row.username }, jwtSecret, {
      expiresIn: "1h",
    });
    res.json({ auth: true, token });
  });
});

// POST /transactions
app.post("/transactions", authenticateJWT, async (req, res) => {
  const { type, category, amount, date, description } = req.body;
  const userId = req.user.id; // Get user ID from token

  const query = `
    INSERT INTO transactions (type, category, amount, date, description, userId) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  try {
    const result = await runQuery(query, [
      type,
      category,
      amount,
      date,
      description,
      userId,
    ]);
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    res.status(error.status).json({ error: error.message });
  }
});

// GET /transactions (with pagination)
app.get("/transactions", authenticateJWT, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  db.all(
    "SELECT * FROM transactions WHERE userId = ? LIMIT ? OFFSET ?",
    [req.user.id, limit, offset],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// GET /transactions/:id
app.get("/transactions/:id", authenticateJWT, (req, res) => {
  const id = req.params.id;
  db.get(
    "SELECT * FROM transactions WHERE id = ? AND userId = ?",
    [id, req.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(row);
    }
  );
});

// PUT /transactions/:id
app.put("/transactions/:id", authenticateJWT, async (req, res) => {
  const id = req.params.id;
  const { type, category, amount, date, description } = req.body;

  const query = `
    UPDATE transactions 
    SET type = ?, category = ?, amount = ?, date = ?, description = ? 
    WHERE id = ? AND userId = ?`;

  try {
    const result = await runQuery(query, [
      type,
      category,
      amount,
      date,
      description,
      id,
      req.user.id,
    ]);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json({ message: "Transaction updated successfully" });
  } catch (error) {
    res.status(error.status).json({ error: error.message });
  }
});

// DELETE /transactions/:id
app.delete("/transactions/:id", authenticateJWT, async (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM transactions WHERE id = ? AND userId = ?";

  try {
    const result = await runQuery(query, [id, req.user.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(error.status).json({ error: error.message });
  }
});

// GET /summary
app.get("/summary", authenticateJWT, (req, res) => {
  const { startDate, endDate } = req.query;
  const query = `
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses
        FROM transactions
        WHERE userId = ? 
        ${startDate && endDate ? `AND date BETWEEN ? AND ?` : ""}`;

  const params =
    startDate && endDate ? [req.user.id, startDate, endDate] : [req.user.id];

  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const balance = (row.totalIncome || 0) - (row.totalExpenses || 0);
    res.json({
      totalIncome: row.totalIncome || 0,
      totalExpenses: row.totalExpenses || 0,
      balance,
    });
  });
});

// GET /reports/monthly (new endpoint for monthly spending by category)
app.get("/reports/monthly", authenticateJWT, (req, res) => {
  const query = `
    SELECT strftime('%Y-%m', date) AS month, category, SUM(amount) AS total
    FROM transactions
    WHERE userId = ?
    GROUP BY month, category
    ORDER BY month DESC`;

  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
