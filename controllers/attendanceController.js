const Attendance = require("../models/attendance");
const User = require("../models/User");
const moment = require("moment-timezone");
const checkIn = async (req, res) => {
  const { employeeID, checkIn } = req.body;

  try {
    // Tìm user dựa trên employeeID
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

    // Tìm attendance dựa trên employeeID và ngày
    let attendance = await Attendance.findOne({ employeeID, date: today });

    if (!attendance) {
      // Nếu chưa có attendance thì tạo mới
      attendance = new Attendance({
        employeeID,
        name: `${user.firstName} ${user.lastName}`,
        date: today,
        checkIn,
      });
    } else {
      // Nếu đã tồn tại thì thông báo đã check-in
      return res.status(404).json({
        success: false,
        message: "Already checked in for today",
      });
    }

    await attendance.save();

    // Trả về response thành công
    res.status(200).json({
      success: true,
      message: "Check-in successful",
      data: attendance,
    });
  } catch (error) {
    console.error("Check-in error:", error); // Log lỗi
    res.status(500).json({
      success: false,
      message: "Error during check-in",
      error: error.message, // Trả về thông tin lỗi
    });
  }
};

const checkOut = async (req, res) => {
  const { employeeID, checkOut } = req.body;

  try {
    const today = moment()
      .tz("Asia/Ho_Chi_Minh")
      .startOf("day")
      .format("YYYY-MM-DD");

    const attendance = await Attendance.findOne({ employeeID, date: today });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No Check In record found for today",
      });
    }

    // Check if checkOut is already done
    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: "Already checked out for today",
      });
    }

    attendance.checkOut = checkOut;
    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Check-out successful",
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during check-out",
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
};
