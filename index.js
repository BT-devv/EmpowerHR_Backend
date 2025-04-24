const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors"); // Import CORS middleware
const { connectDB } = require("./config/db.js");
const routes = require("./routes/index.js");
const createDailyAttendanceRecords = require("./cronJobs.js"); // Import cron job
const fileUpload = require("express-fileupload");
const { initWebSocket } = require("./sockets/socketManager");
require("dotenv").config();

// Tạo ứng dụng Express
const app = express();
app.use(morgan("dev"));

// Enable CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Connect DB
connectDB();

// Cấu hình Middleware
app.use(express.json()); // Để parse JSON từ body của request
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload());
app.use(express.static("uploads")); // Nếu muốn truy cập ảnh tạm

// Routes
app.use("/api", routes);

// Route cơ bản
app.get("/", (req, res) => {
  res.send("🚀 Server đang chạy!");
});

// Khởi động cron job để cập nhật chấm công hằng ngày
createDailyAttendanceRecords();

const http = require("http");
const server = http.createServer(app);

// Khởi động HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Server running on port: ${PORT}`);
});

// Khởi động WebSocket
initWebSocket(server);
