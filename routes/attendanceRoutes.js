// routes/attendanceRoutes.js
const express = require("express");
const router = express.Router();
const {
  checkIn,
  checkOut,
  getListAttendances,
} = require("../controllers/attendanceController");

router.post("/check-in", checkIn); // Endpoint check-in
router.post("/check-out", checkOut); // Endpoint check-out
router.get("/", getListAttendances);
/* 
GET http://localhost:5000/api/attendances (full danh sách)
GET http://localhost:5000/api/attendances?employeeID=EMP-2500001 (lọc theo EmployeeID)
GET http://localhost:5000/api/attendances?date=2025-03-11 (lọc theo date)
*/
module.exports = router;
