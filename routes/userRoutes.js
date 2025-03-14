const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword,

  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  getNextEmployeeID,
  getQRCode,
  scanQRCode,
} = require("../controllers/userController");
const User = require("../models/User");
const { validateLoginInput } = require("../middlewares/authMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

// Định nghĩa route login với middleware validateLoginInput
router.post("/create-user", createUser); // Create User
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);

router.get("/search", searchUsers);
router.put("/:id", updateUser); // Update User
router.post("/login", login);
router.post("/logout", logout);
router.get("/users", getAllUsers);
router.get("/:id", getUserById);
router.delete("/:id", deleteUser);
router.post("/new-employee-id", getNextEmployeeID);
// Route để lấy mã QR
router.get("/qrcode/:id", authMiddleware, getQRCode);
router.post("/scan-qr", scanQRCode);

module.exports = router;
