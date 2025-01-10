const mongoose = require("mongoose");
const moment = require("moment-timezone");

const attendanceSchema = new mongoose.Schema({
  employeeID: {
    type: String,
    ref: "User", // Liên kết với bảng users
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: () =>
      moment().tz("Asia/Ho_Chi_Minh").startOf("day").format("YYYY-MM-DD"),
  },

  checkIn: {
    type: String, // Lưu giờ theo định dạng "HH:mm"
  },
  checkOut: {
    type: String, // Lưu giờ theo định dạng "HH:mm"
  },
  status: {
    type: String,
    enum: ["absent", "late", "ontime"],
    default: "absent", // Mặc định là "absent" nếu chưa check-in
  },
  breakingHours: {
    type: String, // Lưu định dạng "Xm" hoặc "XhYm"
    default: "1h",
  },
  workingHours: {
    type: String, // Lưu định dạng "Xm" hoặc "XhYm"
    default: "0m",
  },
  capacity: {
    type: String,
    default: "8h", // Default work hours
  },
  overtimeHours: {
    type: String, // Lưu định dạng "Xm" hoặc "XhYm"
    default: "0m",
  },
  timeOff: {
    type: String, // Lưu định dạng "Xm" hoặc "XhYm"
    default: "0m",
  },
});

// Middleware tính toán tự động khi lưu
attendanceSchema.pre("save", async function (next) {
  const capacityMinutes = 8 * 60; // Số phút chuẩn (8 giờ)

  // Tách giờ và phút từ checkIn và checkOut
  const [checkInHour, checkInMinute] = this.checkIn
    ? this.checkIn.split(":").map(Number)
    : [null, null];
  const [checkOutHour, checkOutMinute] = this.checkOut
    ? this.checkOut.split(":").map(Number)
    : [null, null];

  console.log("checkInHour:", checkInHour);
  console.log("checkInMinute:", checkInMinute);

  if (checkInHour !== null) {
    const checkInMinutes = checkInHour * 60 + checkInMinute;

    console.log("checkInMinutes:", checkInMinutes); // Kiểm tra giá trị checkInMinutes

    // Nếu không có checkOut, xem như checkIn đủ để xác định status
    let workingMinutes = 0;
    let overtimeMinutes = 0;
    let timeOffMinutes = 0;

    // Tính thời gian làm việc nếu có checkOut
    if (checkOutHour !== null && checkOutMinute !== null) {
      const checkOutMinutes = checkOutHour * 60 + checkOutMinute;

      console.log("checkOutMinutes:", checkOutMinutes); // Kiểm tra giá trị checkOutMinutes

      workingMinutes = Math.max(
        0,
        checkOutMinutes -
          checkInMinutes -
          parseTimeToMinutes(this.breakingHours)
      );

      overtimeMinutes = Math.max(0, workingMinutes - capacityMinutes);
      timeOffMinutes = Math.max(0, capacityMinutes - workingMinutes);
    }

    // Lưu thời gian dưới dạng "XhYm" hoặc "Xm"
    this.workingHours = formatMinutesToTime(workingMinutes);
    this.overtimeHours = formatMinutesToTime(overtimeMinutes);
    this.timeOff = formatMinutesToTime(timeOffMinutes);

    // Kiểm tra lại logic xác định status
    const lateThreshold = capacityMinutes + 30; // 510 phút (8:30)
    console.log("lateThreshold:", lateThreshold);

    if (checkInMinutes > lateThreshold) {
      console.log('Setting status to "late"');
      this.status = "late";
    } else {
      console.log('Setting status to "ontime"');
      this.status = "ontime";
    }
    console.log("status:", this.status); // Kiểm tra giá trị status
  } else {
    this.status = "absent";
    this.workingHours = "0m";
    this.overtimeHours = "0m";
    this.timeOff = formatMinutesToTime(capacityMinutes);
    console.log("status (absent):", this.status); // Nếu không có checkIn hoặc checkOut
  }

  next();
});

// Chuyển đổi chuỗi thời gian "XhYm" hoặc "Xm" sang số phút
function parseTimeToMinutes(time) {
  const hoursMatch = time.match(/(\d+)h/);
  const minutesMatch = time.match(/(\d+)m/);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return hours * 60 + minutes;
}

// Chuyển đổi số phút sang chuỗi thời gian "XhYm" hoặc "Xm"
function formatMinutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h${remainingMinutes > 0 ? remainingMinutes + "m" : ""}`;
  }

  return `${remainingMinutes}m`;
}

module.exports = mongoose.model("EmployeeAttendance", attendanceSchema);
