const { getDb } = require("./db");
const bcrypt = require("bcryptjs");

// Function to create a new user
const createUser = async (username, password) => {
  const db = getDb();

  // Check if the username already exists
  const existingUser = await findUserByUsername(username);
  if (existingUser) {
    throw new Error("Username already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await db.collection("users").insertOne({
      username,
      password: hashedPassword,
    });

    return result.insertedId; // Return the ID of the newly created user
  } catch (error) {
    throw new Error("Error creating user: " + error.message);
  }
};

// Function to find a user by username
const findUserByUsername = async (username) => {
  const db = getDb();
  return await db.collection("users").findOne({ username });
};

module.exports = {
  createUser,
  findUserByUsername,
};
