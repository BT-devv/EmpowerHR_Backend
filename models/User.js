const mongoose = require("mongoose");

const bcrypt = require("bcryptjs"); // Giữ nguyên bcryptjs nếu bạn dùng thư viện này

// Định nghĩa Schema
const userSchema = new mongoose.Schema({
  avatar: {
    type: String, // Lưu đường dẫn đến ảnh
    required: true,
  },
  employeeID: {
    type: String,
    unique: true, // Đảm bảo là duy nhất
    immutable: true, // Không được chỉnh sửa sau khi tạo
  },
  firstName: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 64,
  },
  lastName: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 64,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
  },
  dateOfBirth: {
    type: Date,
    required: true,
    validate: {
      validator: (value) => {
        const age = new Date().getFullYear() - value.getFullYear();
        return age >= 18; // Đảm bảo người dùng đủ 18 tuổi
      },
      message: "Employee must be at least 18 years old.",
    },
  },
  idCardNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{11}$/, // Chỉ chấp nhận 11 chữ số
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^\(\+84\) 0\d{2} \d{3} \d{4}$/, // Định dạng (+84) 0XX XXX XXXX
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Định dạng email chuẩn
  },
  password: {
    type: String,
    required: true,
  },
  bankAccountNumber: {
    type: String,
  },
  department: {
    type: String,
  },
  startDate: {
    type: Date,
    default: () => Date.now(),
    immutable: true, // Không được thay đổi sau khi tạo
  },
  role: {
    type: String,
    enum: ["Admin", "Manager", "Employee"],
  },
  employeeType: {
    type: String,
    required: true,
    enum: ["Fulltime", "Partime", "Collab", "Intern"],
  },
});
// Tự động tạo Employee ID
userSchema.pre("save", async function (next) {
  if (!this.employeeID) {
    const year = new Date().getFullYear().toString().slice(-2); // Lấy năm hiện tại (VD: 24)
    const companyPrefix = "EMP"; // Prefix của công ty

    // Đếm số lượng tài liệu trong collection
    const count = await mongoose.model("User").countDocuments();
    const id = String(count + 1).padStart(5, "0"); // Tạo số thứ tự tăng dần với 5 chữ số

    this.employeeID = `${companyPrefix}-${year}${id}`;
  }
  next();
});

// Middleware để mã hóa mật khẩu trước khi lưu
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Chỉ hash nếu mật khẩu được thay đổi
  try {
    const salt = await bcrypt.genSalt(10); // Tạo salt
    this.password = await bcrypt.hash(this.password, salt); // Mã hóa mật khẩu
    next();
  } catch (err) {
    next(err);
  }
});
module.exports = mongoose.model("User", userSchema);
