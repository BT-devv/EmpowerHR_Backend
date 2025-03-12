const express = require("express");
const router = express.Router();
const {
  requestOvertime,
  updateOvertimeStatus,
  getPendingOvertime,
  getOvertimeHistory,
} = require("../controllers/overtimeController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/request", authMiddleware, requestOvertime);
router.put("/update-status", authMiddleware, updateOvertimeStatus);
router.get("/pending", getPendingOvertime);
router.get("/history", getOvertimeHistory);
module.exports = router;
