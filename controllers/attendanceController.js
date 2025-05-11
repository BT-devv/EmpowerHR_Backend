const Attendance = require("../models/Attendance");
const User = require("../models/User");
const moment = require("moment-timezone");

const checkIn = async (req, res) => {
  const { employeeID } = req.body;
  const checkInTime = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");

  try {
    const user = await User.findOne({ employeeID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const today = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
    let attendance = await Attendance.findOne({ employeeID, date: today });

    if (attendance) {
      // Nếu đã có bản ghi trong ngày nhưng chưa check-in, cập nhật check-in
      if (!attendance.checkIn) {
        attendance.checkIn = checkInTime;
        attendance.status = "Work from office";
        await attendance.save();
      }
    } else {
      // Nếu chưa có bản ghi -> Tạo mới
      attendance = new Attendance({
        employeeID,
        name: `${user.firstName} ${user.lastName}`,
        date: today,
        checkIn: checkInTime,
        status: "Work from office",
      });
      await attendance.save();
    }

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
  const { employeeID } = req.body;
  const checkOutTime = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");

  try {
    const today = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");

    let attendance = await Attendance.findOne({ employeeID, date: today });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No Check-In record found for today",
      });
    }

    // Cập nhật thời gian Check-out
    attendance.checkOut = checkOutTime;

    // Giới hạn khung giờ làm việc từ 08:30 - 17:30
    const capacityStart = 8 * 60 + 30; // 08:30 -> 510 phút
    const capacityEnd = 17 * 60 + 30; // 17:30 -> 1050 phút
    const breakingTime = 60; // 1 giờ nghỉ trưa

    // Chuyển Check-in và Check-out thành phút trong ngày
    const [checkInHour, checkInMinute, checkInSecond] = attendance.checkIn
      ? attendance.checkIn.split(":").map(Number)
      : [null, null, null];
    const [checkOutHour, checkOutMinute, checkOutSecond] = checkOutTime
      .split(":")
      .map(Number);

    if (checkInHour !== null) {
      const checkInMinutes = checkInHour * 60 + checkInMinute;
      const checkOutMinutes = checkOutHour * 60 + checkOutMinute;

      // ✅ Xác định khoảng thời gian hợp lệ
      let start = Math.max(checkInMinutes, capacityStart);
      let end = Math.min(checkOutMinutes, capacityEnd);

      let workingMinutes = 0;
      if (start < end) {
        workingMinutes = end - start - breakingTime;
      }

      // Giới hạn tối đa 8 giờ (480 phút)
      workingMinutes = Math.min(workingMinutes, 480);

      attendance.workingHours = formatMinutesToTime(
        Math.max(0, workingMinutes)
      );
      attendance.timeOff = formatMinutesToTime(480 - workingMinutes);
      //attendance.status =
      //checkInMinutes > capacityStart + 30 ? "late" : "Work from office";
    } else {
      attendance.status = "absent";
      attendance.workingHours = "0m";
      attendance.timeOff = "8h";
    }

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

// Chuyển đổi "XhYm" hoặc "Xm" sang phút
function parseTimeToMinutes(time) {
  const hoursMatch = time.match(/(\d+)h/);
  const minutesMatch = time.match(/(\d+)m/);
  return (
    (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) +
    (minutesMatch ? parseInt(minutesMatch[1]) : 0)
  );
}

// Chuyển đổi phút sang "XhYm" hoặc "Xm"
function formatMinutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0
    ? `${hours}h${remainingMinutes > 0 ? remainingMinutes + "m" : ""}`
    : `${remainingMinutes}m`;
}

const getListAttendances = async (req, res) => {
  try {
    const { employeeID, date, month, year, status, department, jobTitle } =
      req.query;

    let filter = {};

    if (employeeID) filter.employeeID = employeeID;

    if (date) {
      filter.date = date;
    } else if (month && year) {
      const startDate = moment(`${year}-${month}-01`)
        .startOf("month")
        .format("YYYY-MM-DD");
      const endDate = moment(`${year}-${month}-01`)
        .endOf("month")
        .format("YYYY-MM-DD");
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (status) {
      filter.status = status;
    }

    // Lọc theo department và jobTitle từ bảng User
    let employeeFilter = {};
    if (department) employeeFilter.department = department;
    if (jobTitle) employeeFilter.jobTitle = jobTitle;

    let employeeIDs = null;
    if (Object.keys(employeeFilter).length > 0) {
      const users = await User.find(employeeFilter, "employeeID");
      employeeIDs = users.map((u) => u.employeeID);
      filter.employeeID = { $in: employeeIDs };
    }

    const attendances = await Attendance.find(filter).sort({ date: -1 });

    res.status(200).json({
      success: true,
      message: "Attendance list retrieved successfully",
      data: attendances,
    });
  } catch (error) {
    console.error("Get attendance list error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving attendance list",
      error: error.message,
    });
  }
};

const getAttendanceSummary = async (req, res) => {
  try {
    const { employeeID, startDate, endDate } = req.query;

    let filter = { employeeID };
    if (startDate && endDate) {
      filter.date = {
        $gte: moment(startDate).startOf("day").toDate(),
        $lte: moment(endDate).endOf("day").toDate(),
      };
    }

    const attendances = await Attendance.find(filter);

    let onTimeCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    attendances.forEach((attendance) => {
      if (attendance.status === "Work from office") {
        onTimeCount++;
      } else if (attendance.status === "late") {
        lateCount++;
      } else if (attendance.status === "absent") {
        absentCount++;
      }
    });

    const total = attendances.length;

    res.status(200).json({
      success: true,
      message: "Attendance summary retrieved successfully",
      data: {
        total,
        onTimeCount,
        lateCount,
        absentCount,
      },
    });
  } catch (error) {
    console.error("Get attendance summary error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving attendance summary",
      error: error.message,
    });
  }
};
const getAttendanceByDay = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "Date is required" });
    }

    const attendances = await Attendance.find({ date });

    const summary = {
      total: attendances.length,
      present: 0,
      late: 0,
      absent: 0,
    };

    attendances.forEach((att) => {
      if (att.status === "Work from office") {
        summary.present++;
      } else if (att.status === "late") {
        summary.late++;
      } else if (att.status === "absent") {
        summary.absent++;
      }
    });

    res.status(200).json({
      success: true,
      message: "Attendance statistics for the day",
      data: summary,
    });
  } catch (error) {
    console.error("Get attendance by day error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const getAttendanceByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res
        .status(400)
        .json({ success: false, message: "Year and month are required" });
    }

    const startDate = moment
      .tz(`${year}-${month}-01`, "Asia/Ho_Chi_Minh")
      .startOf("month");
    const endDate = moment(startDate).endOf("month");

    const attendances = await Attendance.find({
      date: {
        $gte: startDate.format("YYYY-MM-DD"),
        $lte: endDate.format("YYYY-MM-DD"),
      },
    });

    const stats = {};

    attendances.forEach((att) => {
      if (!stats[att.employeeID]) {
        stats[att.employeeID] = {
          name: att.name,
          employeeID: att.employeeID,
          present: 0,
          late: 0,
          absent: 0,
        };
      }

      if (att.status === "Work from office") stats[att.employeeID].present++;
      else if (att.status === "late") stats[att.employeeID].late++;
      else if (att.status === "absent") stats[att.employeeID].absent++;
    });

    res.status(200).json({
      success: true,
      message: "Monthly attendance statistics",
      data: Object.values(stats),
    });
  } catch (error) {
    console.error("Get attendance by month error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const { employeeID, startDate, endDate } = req.query;

    if (!employeeID || !startDate || !endDate) {
      return res
        .status(400)
        .json({ success: false, message: "Missing parameters" });
    }

    const attendances = await Attendance.find({
      employeeID,
      date: {
        $gte: moment(startDate).format("YYYY-MM-DD"),
        $lte: moment(endDate).format("YYYY-MM-DD"),
      },
    });

    let summary = {
      total: attendances.length,
      present: 0,
      late: 0,
      absent: 0,
      totalWorkingHours: 0,
    };

    attendances.forEach((att) => {
      if (att.status === "Work from office") summary.present++;
      else if (att.status === "late") summary.late++;
      else if (att.status === "absent") summary.absent++;

      summary.totalWorkingHours += parseTimeToMinutes(att.workingHours || "0m");
    });

    res.status(200).json({
      success: true,
      message: "Employee attendance summary",
      data: {
        ...summary,
        totalWorkingHours: formatMinutesToTime(summary.totalWorkingHours),
      },
    });
  } catch (error) {
    console.error("Get employee attendance summary error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getListAttendances,
  getAttendanceSummary,
  getAttendanceByDay,
  getAttendanceByMonth,
  getEmployeeAttendanceSummary,
};
