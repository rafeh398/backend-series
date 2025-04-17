import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {

    //get user details from frontend
    //validation=> kuch format or to nai
    //check if user already exists: username,email
    //check for images,avatar //yha multer se check krege user ne diya ya nai
    //upload them to cloudinary, avatar 
    //create user object --create entry in db(db k bad sb response mein chla jata ha)
    //remove password and refresh token field 
    //check for user createation 
    //return res



    //start 

    //step 1 req.body se data lo jo form se ayega

    const { fullName, username, email, password } = req.body;
    console.log("email", email);

    //step 2 validate

    if (
        [fullName, username, email, password].some((field) => field?.trim() == "") //some zada field ko check krega and trim kbad b ager empty ha to error throw kro
    ) {
        throw new ApiError(400, "All fields are equired")
    }

    //step3 check user exist from username OR Email

    const existedUser=User.findOne({
        $or:[{username},{email}]
    })

    if (existedUser) {
        throw new ApiError(409,"User ALready Exists")
    }
    //step 4 check for avatar and coverImage(multer) //avatar is required

    const avatarLocalPath=req.files?.avatar[0]?.path //avatar[0] 1st uploaded file
    const coverImageLocalPath=req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
   

    //step 5 check for cloudinary

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // step 6 object bna k database mein entry kr do

  const user=await  User.create(
        {
            fullName,
            avatar: avatar.url,
            coverImage:coverImage?.url || "",
            email,
            password,
            username: username.tolowercase(),

        }
    )
    // step 6 user bn gia to password remove kro or ni bna to error throw kro or ager bn gia to succeessfull apiresponse
    const createdUser=await User.findById(user._id).select("-password -refreshToken") 
    //minus lgao k ye ni chaiye

    if (!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }
    

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user is registered successfully") //(status,data,msg)
    )




})

export { registerUser }