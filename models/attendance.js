const mongoose = require("mongoose");
const moment = require("moment-timezone");

const attendanceSchema = new mongoose.Schema({
  employeeID: { type: String, ref: "User", required: true },
  name: { type: String, required: true },
  date: {
    type: Date,
    required: true,
    default: () => moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"),
  },
  checkIn: { type: String }, // "HH:mm"
  checkOut: { type: String }, // "HH:mm"
  status: {
    type: String,
    enum: ["pending", "absent", "Work from office", "late"],
    default: "pending",
  },
  breakingHours: { type: String, default: "1h" }, // Mặc định nghỉ trưa 1h
  workingHours: { type: String, default: "0m" },
  timeOff: { type: String, default: "0m" },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
