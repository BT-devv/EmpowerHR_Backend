const express = require("express");
const router = express.Router();
const { uploadUserFile } = require("../controllers/uploadController");

router.post("/", uploadUserFile);

module.exports = router;
