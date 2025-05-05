const express = require("express");
const {
  getPermission,
  createPermission,
  assignPermission,
  deletePermission,
  unassignPermission,
} = require("../controllers/permissionController");
const authenticateUser = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", authenticateUser, createPermission);
router.post("/assign-permission", authenticateUser, assignPermission);
router.post("/unassign-permission", authenticateUser, unassignPermission);
router.get("/", getPermission);
router.delete("/:id", deletePermission);
module.exports = router;
