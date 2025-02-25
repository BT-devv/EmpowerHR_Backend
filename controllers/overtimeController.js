const Overtime = require("../models/overtime");
const User = require("../models/User");
const moment = require("moment-timezone");

// Nhân viên gửi yêu cầu OT
const requestOvertime = async (req, res) => {
  try {
    // Lấy employeeID từ token
    const employeeID = req.user.employeeID;

    const { startTime, endTime, reason } = req.body;

    const user = await User.findOne({ employeeID });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const date = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
    const duration = moment(endTime, "HH:mm").diff(
      moment(startTime, "HH:mm"),
      "hours",
      true
    );

    if (duration <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OT time range" });
    }

    const overtime = new Overtime({
      employeeID,
      name: `${user.firstName} ${user.lastName}`,
      date,
      startTime,
      endTime,
      duration,
      reason,
      status: "Pending",
    });

    await overtime.save();
    res.status(200).json({
      success: true,
      message: "Overtime request submitted",
      data: overtime,
    });
  } catch (error) {
    console.error("Overtime request error:", error);
    res.status(500).json({
      success: false,
      message: "Error during overtime request",
      error: error.message,
    });
  }
};

// Manager phê duyệt hoặc từ chối OT
const updateOvertimeStatus = async (req, res) => {
  try {
    // Lấy managerID từ token
    const managerID = req.user.employeeID;

    const { overtimeID, status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const overtime = await Overtime.findById(overtimeID);
    if (!overtime) {
      return res
        .status(404)
        .json({ success: false, message: "Overtime request not found" });
    }

    overtime.status = status;
    overtime.managerID = managerID;
    await overtime.save();

    res.status(200).json({
      success: true,
      message: `Overtime ${status.toLowerCase()}`,
      data: overtime,
    });
  } catch (error) {
    console.error("Update overtime error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating overtime status",
      error: error.message,
    });
  }
};

module.exports = {
  requestOvertime,
  updateOvertimeStatus,
};
