const express = require("express");
const {
  approveAbsence,
  requestAbsence,
  getAbsencesHistory,
  getPendingAbsences,
} = require("../controllers/absenceController");
const authenticateUser = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/approve", authenticateUser, approveAbsence);
router.post("/request", authenticateUser, requestAbsence);
router.get("/pending", getPendingAbsences);
router.get("/history", getAbsencesHistory);

module.exports = router;
