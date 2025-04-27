const mongoose = require("mongoose");
const moment = require("moment-timezone");

const bcrypt = require("bcryptjs"); // Giữ nguyên bcryptjs nếu bạn dùng thư viện này

// Định nghĩa Schema
const userSchema = new mongoose.Schema({
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
  alias: {
    type: String,
    required: true,
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
  emailCompany: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Định dạng email chuẩn
  },
  emailPersonal: {
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
  address: {
    type: String,
    required: true,
  },
  province: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  postcode: {
    type: String,
    required: true,
  },
  bankName: {
    type: String,
  },
  bankAccountNumber: {
    type: String,
    required: true,
  },
  bankAccountName: {
    type: String,
    required: true,
  },
  employeeType: {
    type: String,
    required: true,
    enum: ["Fulltime", "Partime", "Collab", "Intern"],
  },
  department: {
    type: String,
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
  },
  startDate: {
    type: Date,
    default: () =>
      moment().tz("Asia/Ho_Chi_Minh").startOf("day").format("YYYY-MM-DD"),
    immutable: true, // Không được thay đổi sau khi tạo
  },
  joiningDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active", // Assuming default status is Active
  },
  avatar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "fs.files",
  },
  photoID: {
    type: mongoose.Schema.Types.ObjectId, // Ảnh giấy tờ tùy thân
    ref: "fs.files",
  },
  certificate: {
    type: mongoose.Schema.Types.ObjectId, // Chứng chỉ (PDF/Ảnh)
    ref: "fs.files",
  },
  graduationCertificate: {
    type: mongoose.Schema.Types.ObjectId, // Bằng cấp (PDF/Ảnh)
    ref: "fs.files",
  },
  order: {
    type: mongoose.Schema.Types.ObjectId, // Bằng cấp (PDF/Ảnh)
    ref: "fs.files",
  },
  remainingDays: {
    type: Number,
    default: 0,
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

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
