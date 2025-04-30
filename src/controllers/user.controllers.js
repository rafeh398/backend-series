import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async (userId) => {  //yha just generate hue hain particular userid k tokens
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()  //yha br br jwt.sign krne ki zrorat nai
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
    console.log(email);


    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
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
//logout k liye user kaha se le ..login k liye to form dete hain hm
//design kro apna middle ware
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }

        },
        {
            new: true,
        })

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //     Checks for a refresh token in cookies or the request body.

    // Verifies the refresh token using jwt.verify() to ensure it's valid and not expired.

    // Fetches the user from the database using the decoded token's user ID.

    // Compares the refresh token sent by the client with the one stored in the database.

    // Generates new access and refresh tokens if everything is valid.

    // Sends the new tokens back to the client as HTTP-only cookies to keep the session secure.

    // Responds with a success message indicating the access token was refreshed.
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }
    //ager token ha to verify kr lo

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
        //incoming jo user bej rha or decoded match krta jo db mein ha

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired")
        }
        //cookies mein rkhna ha or new generate kr do token

        const options = {
            httpOnly: true,
            secure: true,
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshAccessToken },
                    "access token refreshed "
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    //req.user jo middle ware tha waha se hmy logged in user milega

    const user = await User.findById(req.user?._id)

    //check if old password is correct

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid Password")

    }
    //ab (pre_save)vala function ha user.models mein k save krty time hash hu jaye

    user.password = newPassword; //user mein ik filed ha password usko change kr do 
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password changed successfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user is fetched successfully")
})

const updateAccountDeatils = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "ALL fields are required")
    }

    const updatedUser =await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullName,
            email: email
        }
    }, { new: true }).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(20,updatedUser,"Account details updated successfully"))



})


const updateUserAvatar= asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path //ik file request kro user se ...multer se aya req.file

    if (!avatarLocalPath){
        throw new ApiError(400,"avatar is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    //avatar= response dega but hm just url lete hain
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }
    const updateduser=await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            avatar:avatar.url
        }
    }, {new:true}).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,updateduser,"avatar is updated successfully"))
})
const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedUser, "Cover image updated successfully")
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken,
     changeCurrentPassword, getCurrentUser, updateAccountDeatils,
    updateUserAvatar,updateUserCoverImage }