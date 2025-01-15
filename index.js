const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors"); // Import CORS middleware
const { connectDB } = require("./config/db.js");
const routes = require("./routes/index.js");

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

// Routes
app.use("/api", routes);

// Route cơ bản
app.get("/", (req, res) => {
  res.send("🚀 Server đang chạy!");
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port: ${PORT}`);
});
