const express = require("express");
const { getFileById } = require("../controllers/fileController");

const router = express.Router();

router.get("/:id", getFileById);

module.exports = router;
