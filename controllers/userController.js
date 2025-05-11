const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Role = require("../models/Role");
const moment = require("moment-timezone");
const crypto = require("crypto");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");
const { checkIn, checkOut } = require("./attendanceController");
const { use } = require("../routes/absenceRoutes");
const { text } = require("body-parser");
const otpStore = new Map(); // Lưu OTP tạm thời
const { sendNotification } = require("../sockets/socketManager");
const BlacklistedToken = require("../models/blacklistedToken");

const login = async (req, res) => {
  const { emailCompany, password } = req.body;

  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailCompany)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    if (password.length < 8 || password.length > 64) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password length" });
    }

    // Tìm user theo email & kiểm tra trạng thái Active
    const user = await User.findOne({ emailCompany, status: "Active" });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account does not exist or is inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect Password" });
    }

    // Tạo token có chứa userID
    const token = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        employeeID: user.employeeID,
        emailCompany: user.emailCompany,
        role: user.role,
        lastName: user.lastName,
        firstName: user.firstName,
        avatar: user.avatar,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login success!",
      token,
      userId: user._id, // Gửi userId về client
      _id: user._id,
      employeeID: user.employeeID,
      emailCompany: user.emailCompany,
      role: user.role,
      lastName: user.lastName,
      firstName: user.firstName,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Error Login:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error, please try again later.",
    });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "No token provided." });
    }

    // Lưu token vào danh sách blacklist
    await BlacklistedToken.create({ token });

    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error logging out, please try again later.",
    });
  }
};

const forgotPassword = async (req, res) => {
  const { emailCompany } = req.body;

  try {
    const user = await User.findOne({ emailCompany });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Email không tồn tại" });
    }

    // Tạo mã OTP ngẫu nhiên (6 số)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Hết hạn sau 5 phút

    otpStore.set(emailCompany, { otp, expiresAt });

    // Gửi OTP qua email
    await sendEmail(
      emailCompany,
      " [EmpowerHR] - Mã OTP yêu cầu thay đổi mật khẩu ",
      `Kính gửi ${user.firstName} ${user.lastName},

Chúng tôi đã nhận được yêu cầu thay đổi mật khẩu hệ thống EmpowerHR. Để hoàn tất quá trình này, vui lòng sử dụng mã OTP (One-Time Password) được cung cấp dưới đây:

🔹 Mã OTP: ${otp}

Mã OTP này có hiệu lực trong vòng 5 phút. Vui lòng nhập mã này để xác nhận yêu cầu đổi mật khẩu.

Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.

🔒 Lưu ý: Không chia sẻ mã OTP này với bất kỳ ai.

Nếu bạn gặp bất kỳ vấn đề nào, vui lòng liên hệ [email bộ phận IT] để được hỗ trợ.

Trân trọng,  
Phòng Hành Chính - Nhân Sự 
📞 [Số điện thoại hỗ trợ]  
✉️ [Email hỗ trợ]`
    );

    res
      .status(200)
      .json({ success: true, message: "OTP đã được gửi đến email" });
  } catch (error) {
    console.error("Lỗi quên mật khẩu:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server, thử lại sau." });
  }
};
const verifyOTP = async (req, res) => {
  const { emailCompany, otp } = req.body;

  try {
    const storedOTP = otpStore.get(emailCompany);
    if (!storedOTP) {
      return res
        .status(400)
        .json({ success: false, message: "OTP không hợp lệ hoặc đã hết hạn" });
    }

    if (storedOTP.otp !== otp) {
      return res
        .status(400)
        .json({ success: false, message: "OTP không chính xác" });
    }

    // Nếu OTP đúng, xóa khỏi bộ nhớ tạm
    otpStore.delete(emailCompany);
    return res.status(200).json({
      success: true,
      message: "OTP hợp lệ. Vui lòng nhập mật khẩu mới",
    });
  } catch (error) {
    console.error("Lỗi xác minh OTP:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server, thử lại sau." });
  }
};
const resetPassword = async (req, res) => {
  const { emailCompany, newPassword } = req.body;

  try {
    const user = await User.findOne({ emailCompany });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Email không tồn tại" });
    }

    // Cập nhật mật khẩu mới không mã hóa
    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Mật khẩu đã được đặt lại thành công" });
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server, thử lại sau." });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { status, department, jobTitle } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (jobTitle) filter.jobTitle = jobTitle;

    const users = await User.find(filter);

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "Không có dữ liệu người dùng" });
    }

    res.status(200).json(users); // Trả về danh sách người dùng
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving user", error: error.message });
  }
};

const generatePassword = (length = 8) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const sendEmail = async (emailCompany, subject, text) => {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "lupinnguyen1811@gmail.com", // Thay bằng email của bạn
        pass: "owdn vxar raqc vznv", // Thay bằng mật khẩu ứng dụng (App Password)
      },
    });

    let mailOptions = {
      from: "lupinnguyen1811@gmail.com",
      to: emailCompany,
      subject: subject,
      text: text,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Email đã được gửi thành công!");
  } catch (error) {
    console.error("❌ Gửi email thất bại:", error.message);
  }
};

const createUser = async (req, res) => {
  const {
    firstName,
    lastName,
    alias,
    dateOfBirth,
    gender,
    idCardNumber,
    phoneNumber,
    emailCompany,
    emailPersonal,
    password, // Mật khẩu đã được mã hóa trước hoặc null để tạo ngẫu nhiên
    address,
    province,
    city,
    postcode,
    bankName,
    bankAccountNumber,
    bankAccountName,
    department, // ID từ client
    jobTitle, // ID từ client
    employeeType,
    role: roleName,
    joiningDate,
    endDate,
    status,
  } = req.body;

  try {
    // Tìm role theo tên
    const roleDoc = await Role.findOne({ name: roleName });
    if (!roleDoc) {
      return res.status(400).json({ message: "Vai trò không tồn tại!" });
    }

    // Kiểm tra email công ty đã tồn tại chưa
    const existingUser = await User.findOne({ emailCompany });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại. Vui lòng sử dụng email khác.",
      });
    }

    // Nếu không có mật khẩu thì tạo mật khẩu ngẫu nhiên
    const userPassword = password || generatePassword();

    // Tạo người dùng mới
    const newUser = new User({
      firstName,
      lastName,
      alias,
      dateOfBirth,
      gender,
      idCardNumber,
      phoneNumber,
      emailCompany,
      emailPersonal,
      password: userPassword,
      address,
      province,
      city,
      postcode,
      bankName,
      bankAccountNumber,
      bankAccountName,
      department, // là ObjectId
      jobtitle: jobTitle, // lưu đúng theo schema là `jobtitle`
      employeeType,
      role: roleDoc._id,
      joiningDate,
      endDate,
      status,
    });

    await newUser.save();

    // Gửi email chứa thông tin đăng nhập
    await sendEmail(
      emailCompany,
      " [EmpowerHR] Thông Tin Đăng Nhập Tài Khoản Nhân Viên",
      `Kính gửi ${firstName} ${lastName},

Chào mừng bạn đến với hệ thống EmpowerHR! Dưới đây là thông tin đăng nhập tài khoản của bạn:

🔹 Tên đăng nhập (Email công ty): ${emailCompany}  
🔹 Mật khẩu tạm thời: ${userPassword}  

Vui lòng đăng nhập vào hệ thống tại [link hệ thống], sau đó thay đổi mật khẩu để đảm bảo an toàn.

🔒 Hướng dẫn thay đổi mật khẩu:
 1️⃣ Truy cập vào [link hệ thống]  
 2️⃣ Đăng nhập bằng thông tin trên  
 3️⃣ Vào mục Tài khoản > Đổi mật khẩu 
 4️⃣ Xác nhận OTP được gửi qua email và tạo mật khẩu mới  

Nếu bạn gặp bất kỳ vấn đề nào, vui lòng liên hệ [email bộ phận IT] để được hỗ trợ.

Trân trọng,  
Phòng Hành Chính - Nhân Sự  
📞 [Số điện thoại hỗ trợ]  
✉️ [Email hỗ trợ]`
    );

    res.status(201).json({
      success: true,
      message:
        "Tạo người dùng thành công! Mật khẩu đã được gửi về email công ty.",
      user: newUser,
    });
  } catch (error) {
    console.error("Lỗi tạo người dùng:", error.message);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo người dùng.",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    alias,
    dateOfBirth,
    gender,
    idCardNumber,
    phoneNumber,
    emailCompany,
    emailPersonal,
    address,
    province,
    city,
    postcode,
    bankName,
    bankAccountNumber,
    bankAccountName,
    department,
    jobTitle,
    employeeType,
    role,
    joiningDate,
    endDate,
    status,
  } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại.",
      });
    }

    // Kiểm tra định dạng email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailCompany && !emailRegex.test(emailCompany)) {
      return res.status(400).json({
        success: false,
        message: "Email công ty không hợp lệ.",
      });
    }

    if (emailPersonal && !emailRegex.test(emailPersonal)) {
      return res.status(400).json({
        success: false,
        message: "Email cá nhân không hợp lệ.",
      });
    }

    // Cập nhật thông tin người dùng

    user.firstName = firstName || user.firstName;
    user.alias = alias || user.alias;
    user.lastName = lastName || user.lastName;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.gender = gender !== undefined ? gender : user.gender;
    user.idCardNumber = idCardNumber || user.idCardNumber;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.emailCompany = emailCompany || user.emailCompany;
    user.emailPersonal = emailPersonal || user.emailPersonal;
    user.bankName = bankName || user.bankName;
    user.bankAccountNumber = bankAccountNumber || user.bankAccountNumber;
    user.bankAccountName = bankAccountName || user.bankAccountName;
    user.department = department || user.department;
    user.jobTitle = jobTitle || user.jobTitle;
    user.role = role || user.role;
    user.employeeType = employeeType || user.employeeType;
    user.status = status || user.status;
    user.address = address || user.address;
    user.province = province || user.province;
    user.city = city || user.city;
    user.postcode = postcode || user.postcode;
    user.joiningDate = joiningDate || user.joiningDate;
    user.endDate = endDate || user.endDate;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công!",
      user,
    });
  } catch (error) {
    console.error("Lỗi cập nhật người dùng:", error.message);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật thông tin người dùng.",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { status: "Inactive" }, // Chỉ cập nhật trạng thái
      { new: true } // Trả về document đã cập nhật
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Người dùng đã được chuyển sang trạng thái Inactive.",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server.",
      error: error.message,
    });
  }
};

const searchUsers = async (req, res) => {
  const { keyword } = req.query;

  try {
    const users = await User.find({
      $or: [
        { emailCompany: { $regex: keyword, $options: "i" } },
        { emailPersonal: { $regex: keyword, $options: "i" } },
        { firstName: { $regex: keyword, $options: "i" } },
        { lastName: { $regex: keyword, $options: "i" } },
      ],
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng nào phù hợp.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tìm kiếm thành công!",
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tìm kiếm người dùng.",
      error: error.message,
    });
  }
};

const getNextEmployeeID = async (req, res) => {
  try {
    const year = new Date().getFullYear().toString().slice(-2); // Lấy 2 số cuối của năm hiện tại
    const companyPrefix = "EMP"; // Prefix của công ty

    // Tìm tài liệu có employeeID lớn nhất trong năm hiện tại
    const lastUser = await User.findOne({
      employeeID: { $regex: `^${companyPrefix}-${year}` },
    })
      .sort({ employeeID: -1 })
      .exec();

    let newIDNumber = 1; // Giá trị mặc định nếu chưa có employeeID nào
    if (lastUser && lastUser.employeeID) {
      const lastID = parseInt(lastUser.employeeID.split("-")[1].slice(2)); // Lấy phần số từ employeeID
      newIDNumber = lastID + 1; // Tăng giá trị lên 1
    }

    // Tạo employeeID tiếp theo
    const newID = String(newIDNumber).padStart(5, "0");
    const nextEmployeeID = `${companyPrefix}-${year}${newID}`;

    return res.status(200).json({
      success: true,
      employeeID: nextEmployeeID,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to generate next employeeID.",
    });
  }
};

// API để hiển thị mã QR
const getQRCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const qrData = {
      EmployeeID: user.employeeID,
      Name: `${user.firstName} ${user.lastName}`,
      Department: user.department,
      Role: user.role,
      EmployeeType: user.employeeType,
    };

    QRCode.toDataURL(JSON.stringify(qrData), (err, url) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error generating QR Code",
          error: err.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "QR Code generated successfully",
        qrCode: url,
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};
// API scan QR
const scanQRCode = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData || !qrData.EmployeeID) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR Code data",
      });
    }

    const employeeID = qrData.EmployeeID;
    const now = moment().tz("Asia/Ho_Chi_Minh");
    const today = now.format("YYYY-MM-DD");
    const nowTime = now.format("HH:mm:ss");

    // Tìm bản ghi điểm danh hôm nay
    let attendance = await Attendance.findOne({ employeeID, date: today });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found for today",
      });
    }

    if (!attendance.checkIn) {
      // Chưa check-in
      attendance.checkIn = nowTime;
      attendance.status = "Work from office";
      await attendance.save();

      // Gửi thông báo check-in
      const scheduledCheckIn = moment.tz(
        `${today} 08:30:00`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Ho_Chi_Minh"
      );
      const diffMinutes = now.diff(scheduledCheckIn, "minutes");
      let timingMessage = "";

      if (diffMinutes < 0) {
        timingMessage = `${Math.abs(diffMinutes)}m early`;
      } else if (diffMinutes === 0) {
        timingMessage = `You are on time`;
      } else {
        timingMessage = `${diffMinutes}m late`;
      }

      const formattedDate = now.format("dddd, MMMM D - YYYY h:mm A");
      const message = `You have successfully check-in at ${formattedDate} ${timingMessage}`;

      sendNotification(employeeID, "Attendance", message);

      return checkIn({ body: { employeeID } }, res);
    } else {
      // Đã check-in, thực hiện check-out
      const checkoutRes = await checkOut({ body: { employeeID } }, res);

      // Gửi thông báo check-out
      const formattedDate = now.format("dddd, MMMM D - YYYY h:mm A");
      const message = `You have successfully check-out at ${formattedDate}`;
      sendNotification(employeeID, "Attendance", message);

      return checkoutRes;
    }
  } catch (error) {
    console.error("QR Scan error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing QR Code",
      error: error.message,
    });
  }
};

module.exports = {
  login,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword,
  getAllUsers,
  getUserById,
  updateUser,
  createUser,
  deleteUser,
  searchUsers,
  getNextEmployeeID,
  getQRCode,
  scanQRCode,
};
