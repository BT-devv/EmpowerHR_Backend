const express = require("express");
const router = express.Router();
const {
  requestOvertime,
  updateOvertimeStatus,
} = require("../controllers/overtimeController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/request", authMiddleware, requestOvertime);
router.put("/update-status", authMiddleware, updateOvertimeStatus);

module.exports = router;
