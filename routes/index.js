const express = require("express");
const userRoutes = require("./userRoutes.js");
const attendanceRoutes = require("./attendanceRoutes.js");

const router = express.Router();

// Mounting routes with descriptive base paths
router.use("/user", userRoutes); // Plural form for consistency
router.use("/attendance", attendanceRoutes); // Plural form for consistency

module.exports = router;
