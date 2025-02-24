const express = require("express");
const userRoutes = require("./userRoutes.js");
const attendanceRoutes = require("./attendanceRoutes.js");
const payrollRoutes = require("./payrollRouter.js");
const absence = require("./absenceRoutes.js");
const overtime = require("./overtimeRoutes");

const router = express.Router();

// Mounting routes with descriptive base paths
router.use("/user", userRoutes); // Plural form for consistency
router.use("/attendance", attendanceRoutes); // Plural form for consistency
router.use("/payroll", payrollRoutes);
router.use("/absence", absence);
router.use("/overtime", overtime);

module.exports = router;
