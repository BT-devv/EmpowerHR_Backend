const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const moment = require("moment-timezone");
const crypto = require("crypto");
// const nodemailer = require("nodemailer");

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Mật khẩu phải từ 8-64 ký tự
    if (password.length < 8 || password.length > 64) {
      return res.status(400).json({
        success: false,
        message: "Invalid password length",
      });
    }

    // Tài khoản không tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account does not exist",
      });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect Password",
      });
    }

    // Tạo token
    const token = jwt.sign(
      { employeeID: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login success!",
      token,
    });
  } catch (error) {
    console.error("Error Login:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error, please try again later.",
    });
  }
};

// Xử lý yêu cầu quên mật khẩu
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Kiểm tra email có tồn tại trong cơ sở dữ liệu không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email does not exist",
      });
    }

    // Nếu email tồn tại, tạo mã reset mật khẩu
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Lưu token và thời gian hết hạn vào cơ sở dữ liệu
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // Token hết hạn sau 15 phút
    await user.save();

    // Tạo URL đặt lại mật khẩu
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/reset-password/${resetToken}`;

    // Cấu hình dịch vụ gửi email
    const transporter = nodemailer.createTransport({
      service: "Gmail", // Thay bằng dịch vụ phù hợp
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Cấu hình email gửi đi
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user.email,
      subject: "Yêu cầu đặt lại mật khẩu",
      text: `Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng click vào link sau để đặt lại mật khẩu: ${resetURL}`,
    };

    // Gửi email cho người dùng
    await transporter.sendMail(mailOptions);

    // Trả về thông báo thành công
    return res.status(200).json({
      success: true,
      message: "Email đặt lại mật khẩu đã được gửi.",
    });
  } catch (error) {
    console.error("Error in Forgot Password:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra. Vui lòng thử lại sau.",
      error: error.message, // Trả về chi tiết lỗi
    });
  }

  if (password !== user.password) {
    //   console.log("Email nè :"+email);
    //   console.log("pass nè :"+password);
    //   console.log("pass mẫu nè :"+user.password);
    return res.status(401).json({
      success: false,
      message: "Mật khẩu không đúng. Vui lòng thử lại.",
    });
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return res.status(200).json({
    success: true,
    message: "Đăng nhập thành công!",
    token,
  });
};

// Xử lý đặt lại mật khẩu
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    // Mã hóa token để kiểm tra
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Tìm user theo token và kiểm tra hạn
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() }, // Kiểm tra xem token có hết hạn chưa
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // Cập nhật mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined; // Xóa token cũ
    user.resetPasswordExpire = undefined; // Xóa thời gian hết hạn

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Error in Reset Password:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find(); // Lấy toàn bộ dữ liệu trong bảng users
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "Không có dữ liệu người dùng" });
    }

    res.status(200).json(users); // Trả về dữ liệu dạng JSON
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

const createUser = async (req, res) => {
  const {
    avatar,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    idCardNumber,
    phoneNumber,
    email,
    password,
    bankAccountNumber,
    department,
    role,
    employeeType,
    status,
    address,
    province,
    city,
    postcode,
  } = req.body;

  try {
    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại. Vui lòng sử dụng email khác.",
      });
    }

    // Tạo user mới
    const newUser = new User({
      avatar,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      idCardNumber,
      phoneNumber,
      email,
      password,
      bankAccountNumber,
      department,
      role,
      employeeType,
      status,
      address,
      province,
      city,
      postcode,
    });

    // Lưu user vào database
    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Tạo người dùng thành công!",
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
    avatar,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    idCardNumber,
    phoneNumber,
    email,
    password,
    bankAccountNumber,
    department,
    role,
    employeeType,
    status,
    address,
    province,
    city,
    postcode,
  } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại.",
      });
    }

    user.avatar = avatar || user.avatar;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.gender = gender !== undefined ? gender : user.gender;
    user.idCardNumber = idCardNumber || user.idCardNumber;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    user.bankAccountNumber = bankAccountNumber || user.bankAccountNumber;
    user.department = department || user.department;
    user.role = role || user.role;
    user.employeeType = employeeType || user.employeeType;
    user.status = status || user.status;
    user.address = address || user.address;
    user.province = province || user.province;
    user.city = city || user.city;
    user.postcode = postcode || user.postcode;

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
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa người dùng thành công!",
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
        { email: { $regex: keyword, $options: "i" } },
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
module.exports = {
  login,
  resetPassword,
  forgotPassword,
  getAllUsers,
  getUserById,
  updateUser,
  createUser,
  deleteUser,
  searchUsers,
  getNextEmployeeID,
};
