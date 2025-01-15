// routes/attendanceRoutes.js
const express = require("express");
const router = express.Router();
const { checkIn, checkOut } = require("../controllers/attendanceController");

router.post("/check-in", checkIn); // Endpoint check-in
router.post("/check-out", checkOut); // Endpoint check-out

module.exports = router;
