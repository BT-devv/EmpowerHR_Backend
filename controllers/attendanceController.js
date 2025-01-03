const Attendance = require('../models/attendance');

// Check-in
exports.checkIn = async (req, res) => {
  try {
    const { userId, checkIn } = req.body;

    // Kiểm tra nếu đã check-in trong ngày
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = await Attendance.findOne({ userId, date: today });
    if (existingRecord) return res.status(400).json({ message: 'User already checked in today' });

    const attendance = new Attendance({ userId, date: today, checkIn });
    await attendance.save();
    res.status(201).json({ message: 'Checked in successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Error during check-in', error });
  }
};

// Check-out
exports.checkOut = async (req, res) => {
  try {
    const { userId, checkOut } = req.body;

    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) return res.status(404).json({ message: 'No check-in record found for today' });

    attendance.checkOut = checkOut;

    // Tính toán giờ làm việc
    const checkInTime = new Date(`${today}T${attendance.checkIn}`);
    const checkOutTime = new Date(`${today}T${checkOut}`);
    const workedMilliseconds = checkOutTime - checkInTime;
    const hoursWorked = workedMilliseconds / (1000 * 60 * 60); // Chuyển đổi ra giờ
    attendance.hoursWorked = Math.max(0, hoursWorked);

    // Tính overtime (giả sử giờ làm việc tiêu chuẩn là 8 tiếng)
    attendance.overtimeHours = Math.max(0, hoursWorked - 8);

    await attendance.save();
    res.status(200).json({ message: 'Checked out successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Error during check-out', error });
  }
};
