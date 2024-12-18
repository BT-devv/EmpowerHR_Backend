const mongoose = require("mongoose")
const User = require("./User")
const connectDB = require("../config/db")

connectDB()
taoUser()

function taoUser(){
    try {
        const user =  User.create({
            userID : "0001", 
            userName : "tuanbuiHR123", 
            userPassword : "lamviecdimaythangnhoc", 
            fullName : "Bùi Trung Tuấn", 
            dateOfBirth : 62, 
        })
        user.save()
        console.log(user)

    } catch (e) {
        console.log(e.message)
    }

    const find = user.find()
    console.log(find)

}