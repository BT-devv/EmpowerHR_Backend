const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


// Định nghĩa Schema
const userSchema = new mongoose.Schema({
forgotpassword
    userID: {
        type: String, // Loại dữ liệu: String
        required: true, // Bắt buộc phải có
        unique: true, // Đảm bảo UID là duy nhất
        immutable : true //không cho phép thay đổi trường này
    },
    email: {
        type: String,
        lowercase : true, 
        required: true,
        unique : true, 
    },
    password: {
        type: String,
        required: true,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    firstName : {
        type : String, 
        required : true, 
    }, 
    lastName : {
        type : String, 
    }, 
    dateOfBirth :{ 
        type : Date, //date là yyyy-mm-dd
    }, 
    gender : {  //0-Male 1-Female
        type : Boolean, 
        require : true, 
    },
    userType : {
        type : String, 
        require : true, 

    }, 
    expertise : {   //chuyên môn
        type : String, 
        require : true,
    }, 
    address : {
        type : String, 
        require : true,
    }, 
    province : {
        type : String, 
        require : true
    }, 
    postcode : {
        type : Number, 
        require : true, 
        default : 700000
    }, 
    status : {  //boolean 1-active 0-inactive
        type : Boolean, 
        require : true,
        default : 1
    }, 
    createAt : {
        immutable : true, //khong cho phep thay doi truong nay
        type : Date, 
        default : () => Date.now() //tao ngay mac dinh la hom nay //tao ngay moi neu user chua co ngay
    },updateAt : {
        type : Date, 
        default : () => Date.now() //tao ngay mac dinh la hom nay //tao ngay moi neu user chua co ngay
    },
    
});


=======
  userID: {
    type: String, // Loại dữ liệu: String
    required: true, // Bắt buộc phải có
    unique: true, // Đảm bảo UID là duy nhất
    immutable: true, //không cho phép thay đổi trường này
  },
  email: {
    type: String,
    lowercase: true,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
  },
  dateOfBirth: {
    type: Date, //date là yyyy-mm-dd
  },
  gender: {
    //0-Male 1-Female
    type: Boolean,
    require: true,
  },
  userType: {
    type: "String",
    require: true,
  },
  expertise: {
    //chuyên môn
    type: String,
    require: true,
  },
  address: {
    type: String,
    require: true,
  },
  province: {
    type: String,
    require: true,
  },
  postcode: {
    type: Number,
    require: true,
    default: 700000,
  },
  status: {
    //boolean 1-active 0-inactive
    type: Boolean,
    require: true,
    default: 1,
  },
  createAt: {
    immutable: true, //khong cho phep thay doi truong nay
    type: Date,
    default: () => Date.now(), //tao ngay mac dinh la hom nay //tao ngay moi neu user chua co ngay
  },
  updateAt: {
    type: Date,
    default: () => Date.now(), //tao ngay mac dinh la hom nay //tao ngay moi neu user chua co ngay
  },
});

// Encrypt password before saving user to the database
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    return next(err);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
// Tạo Model
module.exports = mongoose.model("User", userSchema);
