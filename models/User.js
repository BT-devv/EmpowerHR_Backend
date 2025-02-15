const mongoose = require("mongoose");
const moment = require("moment-timezone");

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
  emailPersonal: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  emailCompany: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Định dạng email chuẩn
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    maxlength: 64,
  },
  bankAccountNumber: {
    type: String,
  },
  department: {
    type: String,
  },
  startDate: {
    type: Date,
    default: () =>
      moment().tz("Asia/Ho_Chi_Minh").startOf("day").format("YYYY-MM-DD"),
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
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Inactive", // Assuming default status is Active
  },
  address: {
    type: String,
  },
  province: {
    type: String,
  },
  city: {
    type: String,
  },
  postcode: {
    type: String,
  },
});
// Tự động tạo Employee ID
userSchema.pre("save", async function (next) {
  if (!this.employeeID) {
    const year = new Date().getFullYear().toString().slice(-2); // Lấy năm hiện tại (VD: 24)
    const companyPrefix = "EMP"; // Prefix của công ty

    // Tìm tài liệu có employeeID lớn nhất
    const lastUser = await mongoose
      .model("User")
      .findOne({ employeeID: { $regex: `^${companyPrefix}-${year}` } }) // Tìm theo năm hiện tại
      .sort({ employeeID: -1 }) // Sắp xếp giảm dần
      .exec();

    let newIDNumber = 1; // Giá trị mặc định nếu chưa có employeeID nào
    if (lastUser && lastUser.employeeID) {
      const lastID = parseInt(lastUser.employeeID.split("-")[1].slice(2)); // Lấy phần số từ employeeID
      newIDNumber = lastID + 1; // Tăng giá trị lên 1
    }

    // Tạo employeeID mới
    const newID = String(newIDNumber).padStart(5, "0"); // Định dạng với 5 chữ số
    this.employeeID = `${companyPrefix}-${year}${newID}`;
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

// Phương thức để kiểm tra mật khẩu khi người dùng đăng nhập
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware tự động cập nhật `updateAt` mỗi khi thay đổi dữ liệu
userSchema.pre("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.updateAt = Date.now();
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
