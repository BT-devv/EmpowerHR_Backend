const express = require("express");
const router = express.Router();
const {
  createPayroll,
  getAllPayrolls,
  getPayrollById,
  updatePayroll,
  deletePayroll,
  getPayrollSummary,
} = require("../controllers/payrollController");

router.post("/", createPayroll);
router.get("/", getAllPayrolls);
/*/api/payrolls — tất cả
/api/payrolls?employeeID=NV001 — theo nhân viên
/api/payrolls?month=04&year=2025 — theo tháng
/api/payrolls?employeeID=NV001&month=04&year=2025 — theo nhân viên và tháng*/
router.get("/:id", getPayrollById);
router.put("/:id", updatePayroll);
router.delete("/:id", deletePayroll);
router.get("/summary", getPayrollSummary);
/*GET /api/payrolls/summary?month=4&year=2025
GET /api/payrolls/summary?employeeID=NV001&month=3&year=2025*/

module.exports = router;
