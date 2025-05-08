import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


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

    const updatedUser = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullName,
            email: email
        }
    }, { new: true }).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(20, updatedUser, "Account details updated successfully"))



})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path //ik file request kro user se ...multer se aya req.file

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is missing")
    }

    const user = await User.findById(req.user?._id)
    if (user.avatar) {  //databse se avatar ager ha to
        const oldPublicId = extractPublicIdFromUrl(user.avatar);
        await deleteFromCloudinary(oldPublicId);
    }



    const avatar = await uploadOnCloudinary(avatarLocalPath)
    //avatar= response dega but hm just url lete hain
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }
    const updateduser = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url
        }
    }, { new: true }).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200, updateduser, "avatar is updated successfully"))
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path //user ne file di uska path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //ager user ne file di ha to purani delete kr dr do db se user le kr

    const user = await User.findById(req.user?._id)
    if (user.coverImage) {  //databse se coverimage ager ha to
        const oldPublicId = extractPublicIdFromUrl(user.coverImage);
        await deleteFromCloudinary(oldPublicId);
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on coverImage")

    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "Cover image updated successfully")
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params //url se username lo

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",  //SUbscription model se
                localField: "_id",  //user id 
                foreignField: "channel", //channel doc dekho to subscribers mil jayege
                as: "subscribers"//subscriber mil gye
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",//subscriber doc dhundy ge to jinko mene follow kiya wo mil jayega
                as: "subscribedTo"// following 

            }
        },
        {
            $addFields: {
                subscriberscount: {
                    $size: "$subscribers"    //from as
                },
                channelSubscribedTo: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        //dekh lo k ager apke ps jo subscribers wala document(array) ha us mein 
                        // Main mjood hu to ok wrna btn follow wala show kro
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //field k andr ja k subscriber dekho na k owner
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            //project laga k selected cheeze do
            $project: {
                fullName: 1,
                username: 1,
                subscriberscount: 1,
                channelSubscribedTo: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }

    ])
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "user channel is fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    // When a user watches a video, you push the video’s ObjectId into the watchHistory array.
    // watchHistory is present in the user model as an array of video ObjectIds.

    const user = await User.aggregate([
        {
            // Match the user by their ObjectId to get the correct user
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id) // current user
            }
        },
        {
            // Lookup the 'videos' collection to populate video details based on the watchHistory array
            $lookup: {
                from: "videos",  // Look for the 'videos' collection
                localField: "watchHistory",  // Field in the User model that stores video IDs
                foreignField: "_id",  // Match the video IDs in 'watchHistory' to the '_id' field in the 'videos' collection
                as: "watchHistory",  // This will hold the video details in an array
                pipeline: [
                    {
                        // Lookup to find the owner (uploader) of each video
                        $lookup: {
                            from: "users",  // Look for the 'users' collection to get the owner's details
                            localField: "owner",  // The 'owner' field in the video collection refers to the user who uploaded it
                            foreignField: "_id",  // Match the 'owner' field to the '_id' field of the 'users' collection
                            as: "owner",  // This will create an array of owner details
                            pipeline: [
                                {
                                    // Project (select) only the relevant fields from the user (owner)
                                    $project: {
                                        fullName: 1,  // Include full name of the user
                                        username: 1,  // Include username
                                        avatar: 1  // Include avatar URL
                                    }
                                }
                            ]
                        }
                    },
                    {
                        // After the nested $lookup, we use $addFields to simplify the owner array
                        $addFields: {
                            owner: {
                                $first: "$owner"  // Extract the first (and only) owner from the array
                            }
                        }
                    }
                ]
            }
        }
    ])

    // Return the user's watch history with the populated video and owner details
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,  // The populated watch history with video and owner details
                "Watch history fetched successfully"  // Success message
            )
        )
})

export {
    registerUser, loginUser, logoutUser, refreshAccessToken,
    changeCurrentPassword, getCurrentUser, updateAccountDeatils,
    updateUserAvatar, updateUserCoverImage, getUserChannelProfile,
    getWatchHistory,
}