const express = require("express");
const {
  createJobtitle,
  deleteJobtitle,
  updatedJobtitle,
  getAllJobtitle,
  assignJobtitle,
} = require("../controllers/jobtitleController");
const authenticateUser = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", createJobtitle);
router.get("/", getAllJobtitle);
router.put("/:id", updatedJobtitle);
router.delete("/:id", deleteJobtitle);
router.post("/assign-jobtitle", assignJobtitle);

module.exports = router;
