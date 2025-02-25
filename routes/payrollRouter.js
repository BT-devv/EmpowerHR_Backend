const express = require("express");
const router = express.Router();
const { calculatePayroll } = require("../controllers/payrollController");

router.post("/calculate", calculatePayroll); // Create User

module.exports = router;
