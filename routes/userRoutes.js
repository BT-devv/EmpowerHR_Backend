const express = require('express');
const router = express.Router();
const {
  login,
  resetPassword,
  forgotPassword,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
} = require("../controllers/userController");
const User = require("../models/User");
const { validateLoginInput } = require("../middlewares/authMiddleware");

// Định nghĩa route login với middleware validateLoginInput
router.post("/users", createUser); // Create User
router.post("/resetPassword", resetPassword);
router.post("/forgotPassword", forgotPassword);
router.get("/users/search", searchUsers);
router.put("/users/:id", updateUser); // Update User
router.post("/login", login);
router.get("/getallusers", getAllUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:id", deleteUser);


module.exports = router;
