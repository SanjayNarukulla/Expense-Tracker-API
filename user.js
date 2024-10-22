// user.js
const db = require("./db"); // Assuming you have a db.js for SQLite setup
const bcrypt = require("bcryptjs");

const createUser = async (username, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.run("INSERT INTO users (username, password) VALUES (?, ?)", [
    username,
    hashedPassword,
  ]);
};

const findUserByUsername = async (username) => {
  return await db.get("SELECT * FROM users WHERE username = ?", [username]);
};

module.exports = {
  createUser,
  findUserByUsername,
};
