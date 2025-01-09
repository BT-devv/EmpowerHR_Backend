// index.js
const express = require("express");
const mongoose = require('mongoose');
const morgan = require("morgan");
const { connectDB } = require("./config/db.js");
const authRoutes = require("./routes/userRoutes.js");
const attendanceRoutes = require('./routes/attendanceRoutes'); // Đảm bảo import đúng

require("dotenv").config();

// Tạo ứng dụng Express
const app = express();

// Sử dụng morgan với định dạng 'dev'
app.use(morgan("dev"));

// Connect DB
connectDB();

// Cấu hình Middleware
app.use(express.json()); // Để parse JSON từ body của request

app.use("/api", authRoutes);
app.use('/api', attendanceRoutes);  // Đảm bảo route này đang sử dụng đúng '/api'

// Route cơ bản
app.get("/", (req, res) => {
  res.send("🚀 Server đang chạy!");
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port: ${PORT}`);
});
