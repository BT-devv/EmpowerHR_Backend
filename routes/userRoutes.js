const express = require("express");
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
  getNextEmployeeID,
} = require("../controllers/userController");
const User = require("../models/User");
const { validateLoginInput } = require("../middlewares/authMiddleware");

// Định nghĩa route login với middleware validateLoginInput
router.post("/create-user", createUser); // Create User
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);

router.get("/search", searchUsers);
router.put("/:id", updateUser); // Update User
router.post("/login", login);
router.get("/users", getAllUsers);
router.get("/:id", getUserById);
router.delete("/:id", deleteUser);
router.get("/new-employee-id", getNextEmployeeID);

module.exports = router;
