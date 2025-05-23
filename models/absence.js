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
  session: {
    type: String,
    enum: ["Morning", "Afternoon"],
    required: function () {
      return this.type === "Half Day";
    },
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
  // Thêm thời gian rời bàn
  leaveFromTime: {
    type: Date,
    required: function () {
      return this.type === "Leave Desk";
    },
  },
  leaveToTime: {
    type: Date,
    required: function () {
      return this.type === "Leave Desk";
    },
  },
  totalLeaveDeskHours: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").toDate(),
  },
  updatedAt: {
    type: Date,
    default: () => moment().tz("Asia/Ho_Chi_Minh").toDate(),
  },
  payLeaveDays: { type: Number, default: 0 }, // số ngày được nghỉ có phép
  unpaidLeaveDays: { type: Number, default: 0 }, // số ngày nghỉ không phép
});

module.exports = mongoose.model("Absence", absenceSchema);
