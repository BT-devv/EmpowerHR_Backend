const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  startDate: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").toDate(),
  },
  endDate: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").toDate(),
  },
});

module.exports = mongoose.model("Holiday", holidaySchema);
