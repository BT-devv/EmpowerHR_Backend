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
const department = require("./departmentRoutes.js");
const jobtitle = require("./jobtitleRoutes.js");
const holiday = require("./holidayRoutes.js");
const basesalary = require("./baseSalaryRoutes.js");
const dependent = require("./dependentRoutes.js");

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
router.use("/department", department);
router.use("/jobtitle", jobtitle);
router.use("/holiday", holiday);
router.use("/base-salary", basesalary);
router.use("/dependent", dependent);

module.exports = router;
