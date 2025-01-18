const Attendance = require("../models/attendance");
const User = require("../models/User");
const moment = require("moment-timezone");

const checkIn = async (req, res) => {
  const { employeeID } = req.body; // Nhận employeeID từ body
  const checkInTime = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss"); // Thời gian check-in hiện tại

  try {
    const user = await User.findOne({ employeeID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const today = moment()
      .tz("Asia/Ho_Chi_Minh")
      .startOf("day")
      .format("YYYY-MM-DD");
    let attendance = await Attendance.findOne({ employeeID, date: today });

    if (!attendance) {
      attendance = new Attendance({
        employeeID,
        name: `${user.firstName} ${user.lastName}`,
        date: today,
        checkIn: checkInTime,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Already checked in for today",
      });
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Check-in successful",
      data: attendance,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Error during check-in",
      error: error.message,
    });
  }
};

const checkOut = async (req, res) => {
  const { employeeID } = req.body; // Nhận employeeID từ body
  const checkOutTime = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss"); // Thời gian check-out hiện tại

  try {
    const today = moment()
      .tz("Asia/Ho_Chi_Minh")
      .startOf("day")
      .format("YYYY-MM-DD");
    const attendance = await Attendance.findOne({ employeeID, date: today });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No Check-In record found for today",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: "Already checked out for today",
      });
    }

    attendance.checkOut = checkOutTime;
    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Check-out successful",
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
