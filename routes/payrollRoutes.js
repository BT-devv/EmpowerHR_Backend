const express = require("express");
const router = express.Router();
const {
  createPayroll,
  getAllPayrolls,
  getPayrollById,
  updatePayroll,
  deletePayroll,
} = require("../controllers/payrollController");

router.post("/", createPayroll);
router.get("/", getAllPayrolls);
router.get("/:id", getPayrollById);
router.put("/:id", updatePayroll);
router.delete("/:id", deletePayroll);

module.exports = router;
