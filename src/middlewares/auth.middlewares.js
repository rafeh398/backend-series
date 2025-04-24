//user ha ya nai ha
import { ApiError } from "../utils/ApiError"
import { asyncHandler } from "../utils/asyncHandler.js"
import  jwt  from "jsonwebtoken"
import { User } from "../models/user.models.js"

export const verifyJWT=asyncHandler(async(req,res,next)=>{

    const token=req.cookies?.accesstoken || req.header("AUthorization")?.replace("Bearer ","")

try {
        if (!token){
            throw new ApiError(401,"Unauthorized request")
        }
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user=User.findById(decodedToken?._id).select(-password -refreshToken)
    
        if (!user){
            //Todo discuss on frontend
            throw new ApiError(401,"Invalid Access Token")
        }
        //ab req mein new object add kro
    
        req.user=user;
        next()
} catch (error) {
    throw new ApiError(401, error?.message || "invalid access token")
    
}

})