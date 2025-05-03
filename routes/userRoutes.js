const secureRouter = require("../utils/secureRouter");
const router = secureRouter();

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

const authMiddleware = require("../middlewares/authMiddleware");

router.post("/login", login);
router.post("/logout", authMiddleware, logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

router.securePost("/create-user", "user.create", authMiddleware, createUser);
router.securePut("/:id", "user.update", authMiddleware, updateUser);
router.secureDelete("/:id", "user.delete", authMiddleware, deleteUser);
router.get("/search", searchUsers);
router.secureGet("/users", "user.read", authMiddleware, getAllUsers);
router.secureGet("/:id", "user.read", authMiddleware, getUserById);

router.post("/new-employee-id", getNextEmployeeID);

router.get("/qrcode/:id", authMiddleware, getQRCode);
router.post("/scan-qr", scanQRCode);
module.exports = router;
