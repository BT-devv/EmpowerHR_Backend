const { connectDB, seedData } = require("./config/db");
const User = require("./models/User"); // Đường dẫn tới file model User

// Dữ liệu mẫu
const user = new User({
  userID: "U001",
  email: "admin@gmail.com",
  password: "password123", // Sẽ được hash
  firstName: "Admin",
  lastName: "Admin",
  dateOfBirth: "1990-01-01",
  gender: 0,
  userType: "admin",
  expertise: "Software Engineering",
  address: "123 Main Street",
  province: "Hanoi",
  postcode: 100000,
  status: 1,
});

// Hàm chạy seed
const runSeed = async () => {
  try {
    await connectDB(); // Kết nối database
    await user.save(); // Middleware `pre("save")` sẽ chạy tại đây
    await seedData(User, user); // Gọi hàm seedData
    console.log("Seeding completed!");
    process.exit(); // Thoát sau khi hoàn tất
  } catch (err) {
    console.error("Error during seeding:", err.message);
    process.exit(1);
  }
};

runSeed();
