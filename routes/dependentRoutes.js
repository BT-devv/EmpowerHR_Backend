const express = require("express");
const router = express.Router();
const {
  createDependent,
  getAllDependents,
  updateDependent,
  deleteDependent,
} = require("../controllers/dependentController");

router.post("/", createDependent);
router.get("/", getAllDependents);
router.put("/:id", updateDependent);
router.delete("/:id", deleteDependent);

module.exports = router;
