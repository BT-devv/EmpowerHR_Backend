const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors"); // Import CORS middleware
const { connectDB } = require("./config/db.js");
const authRoutes = require("./routes/userRoutes.js");
const attendanceRoutes = require("./routes/attendanceRoutes");

require("dotenv").config();

// Tạo ứng dụng Express
const app = express();

// Sử dụng morgan với định dạng 'dev'
app.use(morgan("dev"));

// Enable CORS
app.use(
  cors({
    origin: "http://localhost:5173", // Allow requests from the frontend
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow specific methods
    credentials: true, // If cookies or authentication headers are needed
  })
);

// Connect DB
connectDB();

// Cấu hình Middleware
app.use(express.json()); // Để parse JSON từ body của request

// Routes
app.use("/api", authRoutes);
app.use("/api", attendanceRoutes);

// Route cơ bản
app.get("/", (req, res) => {
  res.send("🚀 Server đang chạy!");
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port: ${PORT}`);
});
