const express = require("express");
const {
  getPermission,
  createPermission,
  assignPermission,
  deletePermission,
} = require("../controllers/permissionController");
const authenticateUser = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", authenticateUser, createPermission);
router.post("/assign-permission", authenticateUser, assignPermission);
router.get("/", getPermission);
router.delete("/:id", deletePermission);
module.exports = router;
