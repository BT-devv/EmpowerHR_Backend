const express = require("express");
const {
  createDepartment,
  deleteDepartment,
  updatedDepartment,
  getAllDepartment,
} = require("../controllers/departmentController");
const authenticateUser = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", createDepartment);
router.get("/", getAllDepartment);
router.put("/:id", updatedDepartment);
router.delete("/:id", deleteDepartment);

module.exports = router;
