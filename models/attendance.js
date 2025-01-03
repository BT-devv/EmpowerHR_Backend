const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  date: {
    type: String,  // Hoặc Date
    required: true,
  },
  checkIn: {
    type: String,
    required: true,
  },
  checkOut: String,
  hoursWorked: {
    type: Number,
    default: 0,
  },
  overtimeHours: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Attendance', attendanceSchema);
