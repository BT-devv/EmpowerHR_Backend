const Attendance = require("../models/attendance");
const User = require("../models/User");
const moment = require("moment-timezone");

const checkIn = async (req, res) => {
  const { employeeID } = req.body;
  const checkInTime = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");

  try {
    const user = await User.findOne({ employeeID });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const today = moment()
      .tz("Asia/Ho_Chi_Minh")
      .startOf("day")
      .format("YYYY-MM-DD");
    let attendance = await Attendance.findOne({ employeeID, date: today });

    if (attendance) {
      return res
        .status(400)
        .json({ success: false, message: "Already checked in for today" });
    }

    attendance = new Attendance({
      employeeID,
      name: `${user.firstName} ${user.lastName}`,
      date: today,
      checkIn: checkInTime,
    });

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Check-in successful",
      data: attendance,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error during check-in",
        error: error.message,
      });
  }
};

const checkOut = async (req, res) => {
  const { employeeID } = req.body;
  const checkOutTime = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");

  try {
    const today = moment()
      .tz("Asia/Ho_Chi_Minh")
      .startOf("day")
      .format("YYYY-MM-DD");
    let attendance = await Attendance.findOne({ employeeID, date: today });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No Check-In record found for today",
      });
    }

    // Cập nhật Check-out mới nhất
    attendance.checkOut = checkOutTime;
    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Check-out updated successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({
      success: false,
      message: "Error during check-out",
      error: error.message,
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
};
