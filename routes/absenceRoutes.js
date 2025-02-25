const express = require("express");
const {
  approveAbsence,
  requestAbsence,
} = require("../controllers/absenceController");
const authenticateUser = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/approve", authenticateUser, approveAbsence);
router.post("/request", authenticateUser, requestAbsence);

module.exports = router;
