const mongoose = require("mongoose");
const moment = require("moment-timezone");
const OvertimeSchema = new mongoose.Schema({
  employeeID: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:mm
  endTime: { type: String, required: true }, // HH:mm
  duration: { type: Number, required: true }, // Số giờ OT
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  }, // Trạng thái
  managerID: { type: String }, // Người duyệt OT
  createdAt: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"),
  },
});

module.exports = mongoose.model("Overtime", OvertimeSchema);
