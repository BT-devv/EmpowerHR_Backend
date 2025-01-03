const express = require("express");
const morgan = require("morgan");
const { connectDB } = require("./config/db.js");
const authRoutes = require("./routes/userRoutes.js");
require("dotenv").config();


// Tạo ứng dụng Express
const app = express();
// Sử dụng morgan với định dạng 'dev'
app.use(morgan("dev"));
//Connect DB
connectDB();

// Cấu hình Middleware
app.use(express.json()); // Để parse JSON từ body của request

app.use("/api", authRoutes);
// Route cơ bản
app.get("/", (req, res) => {
  res.send("🚀 Server đang chạy!");
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port: ${PORT}`);
});
