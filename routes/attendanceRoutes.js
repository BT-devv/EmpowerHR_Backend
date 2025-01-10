// routes/attendanceRoutes.js
const express = require("express");
const router = express.Router();
const { checkIn, checkOut } = require("../controllers/attendanceController");

router.post("/attendance/check-in", checkIn); // Endpoint check-in
router.post("/attendance/check-out", checkOut); // Endpoint check-out

module.exports = router;
