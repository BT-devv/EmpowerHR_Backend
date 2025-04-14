const express = require("express");
const {
  createRole,
  deleteRole,
  updatedRole,
  getRoles,
  assignRole,
} = require("../controllers/roleController");
const authenticateUser = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", authenticateUser, createRole);
router.post("/assign-role", authenticateUser, assignRole);
router.get("/", getRoles);
router.put("/:id", authenticateUser, updatedRole);
router.delete("/:id", authenticateUser, deleteRole);

module.exports = router;
