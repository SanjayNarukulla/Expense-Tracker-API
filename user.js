// user.js
const { getDb } = require("./db");
const bcrypt = require("bcryptjs");

const createUser = async (username, password) => {
  const db = getDb();
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.collection("users").insertOne({
    username,
    password: hashedPassword,
  });

  return result.insertedId;
};

const findUserByUsername = async (username) => {
  const db = getDb();
  return await db.collection("users").findOne({ username });
};

module.exports = {
  createUser,
  findUserByUsername,
};
