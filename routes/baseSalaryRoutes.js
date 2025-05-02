const express = require("express");
const router = express.Router();
const {
  createBaseSalary,
  getAllBaseSalaries,
  updateBaseSalary,
  deleteBaseSalary,
} = require("../controllers/baseSalaryController");

router.post("/", createBaseSalary);
router.get("/", getAllBaseSalaries);
router.put("/:id", updateBaseSalary);
router.delete("/:id", deleteBaseSalary);

module.exports = router;
