const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

=======

const bcrypt = require("bcryptjs"); // Giữ nguyên bcryptjs nếu bạn dùng thư viện này


// Định nghĩa Schema
const userSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true,

    immutable: true, // Không cho phép thay đổi
    immutable: true, // không cho phép thay đổi trường này

  },
  email: {
    type: String,
    lowercase: true,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: Number, // 0 - Male, 1 - Female
    required: true,
    enum: [0, 1],
  },
  userType: {
    type: String,
    required: true,
  },
  expertise: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  province: {
    type: String,
    required: true,
  },
  postcode: {
    type: Number,
    required: true,
    default: 700000,
  },
  status: {
    type: Boolean, // 1 - active, 0 - inactive
    required: true,
    default: 1,
  },
  createAt: {
    immutable: true,
    type: Date,
    default: () => Date.now(),
  },
  updateAt: {
    type: Date,
    default: () => Date.now(),
  },
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
