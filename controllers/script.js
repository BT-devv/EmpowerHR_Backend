const mongoose = require("mongoose")
const User = require("./User")
const connectDB = require("../config/db")

connectDB()
taoUser()

function taoUser(){
    try {
        const user =  User.create({
            userID : "mkt_001001", 
            email : "toidaidot@HREmPowerEd.com",
            firstName : "Bui", 
            lastName : "Trung Tuan", 
            dob : "2003-1-12", 
            gender : 0, 
            userType : "staff", 
            expertise : "PM", 
            address : "64 Bui Thi Xuan", 
            province : "Tan Binh", 
            
        })
        user.save()
        console.log(user)

    } catch (e) {
        console.log(e.message)
    }
}