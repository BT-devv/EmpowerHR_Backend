const mongoose = require("mongoose");
const moment = require("moment-timezone");

const absenceSchema = new mongoose.Schema({
  employeeID: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["Full Day", "Half Day", "Remote", "Leave Desk"],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  halfDaySession: {
    type: String,
    enum: ["Morning", "Afternoon"],
    required: function () {
      return this.type === "Half Day";
    },
  },
  reason: {
    type: String,
    require: true,
  },
  teammate: {
    type: String,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  managerID: {
    type: String,
    require: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Absence", absenceSchema);
