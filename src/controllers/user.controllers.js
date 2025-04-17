import {asyncHandler} from "../utils/asyncHandler.js"

const registerUser=asyncHandler(async(req,res)=>{

//get user details from frontend
//validation=> kuch format or to nai
//check if user already exists: username,email
//check for images //yha multer se check krege user ne diya ya nai
//check for avatar
//upload them to cloudinary, avatar 
//create user object --create entry in db(db k bad sb response mein chla jata ha)
//remove password and refresh token field 
//check for user createation 
//return res



//start 

//step 1 req.body se data lo jo form se ayega

const{fullName,username,email,password}=req.body;
console.log("email",email);
 //step 2 validate
 
 



})

export {registerUser}