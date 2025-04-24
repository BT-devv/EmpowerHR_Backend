const mongoose = require("mongoose");
const moment = require("moment-timezone");

const absenceSchema = new mongoose.Schema({
  employeeID: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["Full Day", "Half Day", "Leave Desk", "Remote"],
    required: true,
  },
  dateFrom: {
    type: Date,
    required: true,
  },
  dateTo: {
    type: Date,
    required: true,
  },
  lineManagers: [
    {
      type: String,
      required: true,
    },
  ], // Quản lý phụ trách (1 hoặc nhiều)
  // Lưu dạng mảng
  teammates: [
    {
      type: String,
    },
  ],
  reason: {
    type: String,
    require: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  managerID: {
    type: String,
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
  createdAt: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").toDate(),
  },
  updatedAt: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").toDate(),
  },
  remainingDays: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Absence", absenceSchema);
