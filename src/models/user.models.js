import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,  //index for searching
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    avatar: {
        type: String,  //Cloudinary Url
        required: true,
    },
    coverImage: {
        type: String,  //Cloudinary Url
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],

    password: {
        type: String,
        required: [true, "password is required"]
    },
    refreshToken: {
        type: String,
    }
}, { timestamps: true })

userSchema.pre("save", async function(next){  //(method,function)
    if (!this.isModified("password")) return next();  //ager filed modify ni hua to nikal jao aghy idr method mein na ayu

    this.password=bcrypt.hash(this.password,10) //(data,rounds)
    next()   
} )
//khud se method bnaya

userSchema.methods.isPasswordCorrect=async function (password) {
 return   await bcrypt.compare(password,this.password)
    
}
//JWT is like key
//jiske ps ha hm dege usko data

userSchema.methods.generateAccessToken=function () {
    jwt.sign({
      _id:this._id, //ye hmy mongoDb se mil jayegi
        email:this.email,
        username:this.username,
        fullName:this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateRefreshToken=function () {
    jwt.sign({
        _id:this._id, //ye hmy mongoDb se mil jayegi
         
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
          expiresIn:process.env.REFRESH_TOKEN_EXPIRY
      }
  )
}

export const User = mongoose.model("User", userSchema)