const express = require("express");
const {
  createHoliday,
  getAllHolidays,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/holidayController");

const router = express.Router();

router.post("/", createHoliday);
router.get("/", getAllHolidays);
router.put("/:id", updateHoliday);
router.delete("/:id", deleteHoliday);

module.exports = router;
