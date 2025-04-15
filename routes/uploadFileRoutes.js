const express = require("express");
const router = express.Router();
const { uploadUserFiles } = require("../controllers/uploadController");

router.post("/", uploadUserFiles);

module.exports = router;
