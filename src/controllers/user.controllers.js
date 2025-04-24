import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { log } from "console";

const generateAccessAndRefreshTokens = async (userId) => {  //yha just generate hue hain particular userid k tokens
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //save in DB
        user.refreshToken = refreshToken  //user k model mein refreh token ha
        await user.save({ validateBeforeSave: false }) //ta k password waghaira ni diya to b save hu
        return { accessToken, refreshToken }
    }
    catch {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

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
    //step 2 validate

    if (
        [fullName, username, email, password].some((field) => field?.trim() == "") //some zada field ko check krega and trim kbad b ager empty ha to error throw kro
    ) {
        throw new ApiError(400, "All fields are equired")
    }

    //step3 check user exist from username OR Email

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User ALready Exists")
    }
    //step 4 check for avatar and coverImage(multer) //avatar is required

    const avatarLocalPath = req.files?.avatar[0]?.path //avatar[0] 1st uploaded file
    // const coverImageLocalPath=req.files?.coverImage[0]?.path


    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path

    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }


    //step 5 check for cloudinary
    console.log(avatarLocalPath)
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // step 6 object bna k database mein entry kr do

    const user = await User.create(
        {
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase(),

        }
    )
    // step 6 user bn gia to password remove kro or ni bna to error throw kro or ager bn gia to succeessfull apiresponse
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    //minus lgao k ye ni chaiye

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }


    return res.status(201).json(
        new ApiResponse(200, createdUser, "user is registered successfully") //(status,data,msg)
    )




})

const loginUser = asyncHandler(async (req, res) => {

    const { email, username, password } = req.body

    if (!username || !password) {  //ager dono ni
        throw new ApiError(400, "username or password is required")

    }
    //ager dono mein se ik ha to user find kro

    const user = await User.findOne({ $or: [{ username }, { email }] })
    //ager user ni mila 
    if (!user) {
        throw new ApiError(400, "User does not found")
    }
    //ager user mil jaye
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }
    //generate access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    //ab DB se bat kro k loggedin user ka password wghaira ni chaiye

    const loggedInUser = await User.findById(user._id).select(-password - refreshToken)

    //ab bejni cookies jiske option bejne hain

    const options = {  //in se server se update hugi bs ye
        httpOnly: true,
        secure: true
    }

    //response plus cookes

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken
            }, "User Logged in Successfully ")
        )



})

const logoutUser = asyncHandler(async (req, res) => {
 await   User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }

        },
    {
        new:true,
    })

    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))

})

export { registerUser, loginUser, logoutUser }