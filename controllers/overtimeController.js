const Overtime = require("../models/Overtime");
const User = require("../models/User");
const moment = require("moment-timezone");

//Nhân viên gửi request OT
const requestOvertime = async (req, res) => {
  try {
    const employeeID = req.user.employeeID;
    const { projectManager, date, startTime, endTime, reason } = req.body;

    // Kiểm tra đầu vào
    if (!projectManager || !date || !startTime || !endTime || !reason) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng nhập đầy đủ thông tin: projectManager, date, startTime, endTime, reason.",
      });
    }

    // Tìm nhân viên theo employeeID
    const user = await User.findOne({ employeeID });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Nhân viên không tồn tại." });
    }

    // Lấy thời gian hiện tại
    const now = moment().tz("Asia/Ho_Chi_Minh");
    const today = now.clone().startOf("day");

    // Chuyển đổi ngày yêu cầu OT
    const requestDate = moment(date, "YYYY-MM-DD").tz("Asia/Ho_Chi_Minh");

    // Kiểm tra ngày không được là quá khứ
    if (requestDate.isBefore(today)) {
      return res.status(400).json({
        success: false,
        message: "Không thể yêu cầu OT cho ngày trong quá khứ.",
      });
    }

    // Chuyển đổi startTime và endTime thành đối tượng moment
    const startDateTime = moment(`${date} ${startTime}`, "YYYY-MM-DD HH:mm").tz(
      "Asia/Ho_Chi_Minh"
    );
    const endDateTime = moment(`${date} ${endTime}`, "YYYY-MM-DD HH:mm").tz(
      "Asia/Ho_Chi_Minh"
    );

    // Kiểm tra thời gian OT không được trong quá khứ
    if (startDateTime.isBefore(now)) {
      return res.status(400).json({
        success: false,
        message: "Không thể yêu cầu OT cho thời gian trong quá khứ.",
      });
    }

    // Kiểm tra endTime phải sau startTime
    if (!endDateTime.isAfter(startDateTime)) {
      return res.status(400).json({
        success: false,
        message: "Thời gian kết thúc OT phải sau thời gian bắt đầu.",
      });
    }

    // Chỉ cho phép OT sau 17:30 vào các ngày trong tuần (Thứ 2 - Thứ 6)
    const dayOfWeek = requestDate.isoWeekday();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const allowedStartTime = moment(`${date} 17:30`, "YYYY-MM-DD HH:mm").tz(
        "Asia/Ho_Chi_Minh"
      );
      if (startDateTime.isBefore(allowedStartTime)) {
        return res.status(400).json({
          success: false,
          message: "Giờ OT phải sau 17:30 từ Thứ 2 đến Thứ 6.",
        });
      }
    }

    // Tính số giờ OT
    const duration = endDateTime.diff(startDateTime, "hours", true);
    // Giới hạn số giờ OT cho ngày thường là 4h và cuối tuần là 12h
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (duration > 4) {
        return res.status(400).json({
          success: false,
          message: "Số giờ OT vào ngày thường không được vượt quá 4 tiếng.",
        });
      }
    } else {
      if (duration > 12) {
        return res.status(400).json({
          success: false,
          message: "Số giờ OT vào cuối tuần không được vượt quá 12 tiếng.",
        });
      }
    }

    // Lưu vào database
    const overtime = new Overtime({
      employeeID,
      name: `${user.firstName} ${user.lastName}`,
      projectManager,
      date,
      startTime,
      endTime,
      duration,
      reason,
      status: "Pending",
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    });

    await overtime.save();

    res.status(200).json({
      success: true,
      message: "Yêu cầu OT đã được gửi.",
      data: overtime,
    });
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu OT:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi gửi yêu cầu OT.",
      error: error.message,
    });
  }
};

// Manager phê duyệt hoặc từ chối OT
const updateOvertimeStatus = async (req, res) => {
  try {
    // Lấy thông tin người duyệt từ token
    const managerID = req.user.employeeID;
    const managerName = `${req.user.firstName} ${req.user.lastName}`; // Giả sử lấy từ token

    const { overtimeID, status, rejectReason } = req.body;

    // Kiểm tra trạng thái hợp lệ
    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    // Tìm yêu cầu OT
    const overtime = await Overtime.findById(overtimeID);
    if (!overtime) {
      return res
        .status(404)
        .json({ success: false, message: "Overtime request not found" });
    }

    // Kiểm tra quyền duyệt: managerID phải trùng với projectManager của yêu cầu OT
    if (overtime.projectManager !== managerID) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to approve/reject this OT request.",
      });
    }

    // Kiểm tra nếu bị từ chối nhưng không có lý do
    if (status === "Rejected" && !rejectReason) {
      return res.status(400).json({
        success: false,
        message: "Reject reason is required when rejecting an OT request.",
      });
    }

    // Cập nhật trạng thái, thời gian cập nhật, người duyệt
    overtime.status = status;
    overtime.updatedAt = moment().tz("Asia/Ho_Chi_Minh").toDate();
    overtime.approveBy = managerName;

    // Nếu bị từ chối, cập nhật lý do từ chối
    if (status === "Rejected") {
      overtime.rejectReason = rejectReason;
    }

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

// Lấy danh sách yêu cầu OT có trạng thái "Pending"
const getPendingOvertime = async (req, res) => {
  try {
    const pendingOTs = await Overtime.find({ status: "Pending" });

    res.status(200).json({
      success: true,
      message: "Danh sách yêu cầu OT đang chờ duyệt",
      data: pendingOTs,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách OT pending:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi lấy danh sách OT pending.",
      error: error.message,
    });
  }
};

// Lấy danh sách yêu cầu OT có trạng thái khác "Pending"
const getOvertimeHistory = async (req, res) => {
  try {
    const processedOTs = await Overtime.find({ status: { $ne: "Pending" } });

    res.status(200).json({
      success: true,
      message: "Danh sách yêu cầu OT đã được xử lý",
      data: processedOTs,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách OT đã xử lý:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi lấy danh sách OT đã xử lý.",
      error: error.message,
    });
  }
};

module.exports = {
  requestOvertime,
  updateOvertimeStatus,
  getOvertimeHistory,
  getPendingOvertime,
};
