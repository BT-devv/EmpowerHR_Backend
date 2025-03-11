const mongoose = require("mongoose");
const moment = require("moment-timezone");
const OvertimeSchema = new mongoose.Schema({
  employeeID: { type: String, required: true },
  name: { type: String, required: true },
  projectManager: { type: String, required: true },
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
  approveBy: { type: String }, // Người đã duyệt OT
  createdAt: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").toDate(),
  },
  updatedAt: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").toDate(),
  },
  rejectReason: {
    type: String,
    validate: {
      validator: function (value) {
        return (
          this.status !== "Rejected" || (this.status === "Rejected" && value)
        );
      },
      message:
        "Lý do từ chối (rejectReason) là bắt buộc nếu trạng thái là 'Rejected'.",
    },
  },
});

module.exports = mongoose.model("Overtime", OvertimeSchema);
