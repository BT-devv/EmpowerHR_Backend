const express = require("express");
const userRoutes = require("./userRoutes.js");
const attendanceRoutes = require("./attendanceRoutes.js");
const payrollRoutes = require("./payrollRoutes.js");
const absence = require("./absenceRoutes.js");
const overtime = require("./overtimeRoutes");
const role = require("./roleRoutes.js");
const permission = require("./permissionRoutes.js");
const files = require("./fileRoutes");
const upload = require("./uploadFileRoutes.js");

const router = express.Router();

// Mounting routes with descriptive base paths
router.use("/user", userRoutes); // Plural form for consistency
router.use("/attendance", attendanceRoutes); // Plural form for consistency
router.use("/payroll", payrollRoutes);
router.use("/absence", absence);
router.use("/overtime", overtime);
router.use("/role", role);
router.use("/permission", permission);
router.use("/file", files);
router.use("/upload", upload);

module.exports = router;
