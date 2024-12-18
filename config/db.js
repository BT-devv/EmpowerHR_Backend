const mongoose = require("mongoose");
require("dotenv").config(); // Để sử dụng biến môi trường từ .env

// Kết nối MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database established successfully");
  } catch (err) {
    console.error("Database error code: ", err.message);
    process.exit(1); // Thoát ứng dụng nếu kết nối thất bại
  }
};

// Hàm seed data vào MongoDB
const seedData = async (model, data) => {
  try {
    // Xóa dữ liệu cũ (nếu cần)
    await model.deleteMany({});
    console.log(`Existing data in ${model.modelName} cleared.`);

    // Chèn dữ liệu mẫu
    await model.insertMany(data);
    console.log(`Sample data added to collection ${model.modelName}.`);
  } catch (err) {
    console.error("Error seeding data:", err.message);
  }
};

module.exports = { connectDB, seedData };
