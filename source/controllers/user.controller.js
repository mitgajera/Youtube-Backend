import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '60m', 
          });
          const refreshToken = jwt.sign({ _id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '30d', 
          });

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        console.log(error)
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend
    const { fullName, email, username, password } = req.body

    // validation - not empty
    if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are require!")
    }

    if (!email.includes("@")) {
        throw new ApiError(400, "Invalid email")
    }

    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exists")
    }

    // check for images, check for avatar
    let avatarLocalPath;
    if (req.files && req.files.avatar && req.files.avatar[0]) {
        avatarLocalPath = req.files.avatar[0].path;
    } else {
        throw new ApiError(400, "Avatar file is required")
    }    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files?.coverImage && req.files.coverImage[0]) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // upload them to cloudinary, avatar
    let avatar;
    if (avatarLocalPath) {
        try {
            avatar = await uploadOnCloudinary(avatarLocalPath)
        } catch (error) {
            throw new ApiError(400, "Error uploading avatar to cloudinary")
        }
    } else {
        throw new ApiError(400, "Avatar file is required")
    }
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar,
        coverImage,
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the the user")
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {

    // req body -> data
    const { email, username, password } = req.body

    // username or email
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    // find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // password validation
    const isValidPassword = await user.isPasswordCorrect(password)

    if (!isValidPassword) {
        throw new ApiError(401, "Invalid password")
    }

    // access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // send cookie
    const loggedInUser = await User
        .findById(user._id)
        .select("-password -refeshToken")

    const options = {
        httpOnly: true,
        secure: true
    }


    const refreshTokenValue = await refreshToken;

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshTokenValue, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken: accessToken,
                    refreshToken: refreshTokenValue
                },
                "User logged in successfully"
            )
        )
    }
)

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                "User logged out successfully"
            )
        )
    }
)

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken?.value || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
}
)

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confPassword } = req.body

    if (newPassword == oldPassword) {
        throw new ApiError(400, "New password cannot be the same as the old one")
    }

    if (newPassword !== confPassword) {
        throw new ApiError(401, "New Password and conform password must be same")
    }

    const user = await User.findById(req.user?._id)
    const isPaswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPaswordCorrect) {
        throw new ApiError(400, "Invalid password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler((req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    try {
        const { fullName, email } = req.body
    
        if (!fullName || !email) {
            throw new ApiError(400, "All fields are required")
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName: fullName,
                    email: email,
                }
            },
            { new: true }
        ).select("-password")
    
        return res
            .status(200)
            .json(new ApiResponse(200, user, "Account details updated successfully"))
    } catch (error) {
        return res
        .status(400)
        .json(new ApiResponse(400, "Error updating account details"))  
    }
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    await deleteOldAvatar(req, res, async () => {
        const avatarLocalPath = req.file?.path;
        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is missing");
        }
        console.log(`Uploading avatar to Cloudinary: ${avatarLocalPath}`);
        try {
            const avatar = await uploadOnCloudinary(avatarLocalPath);
            if (!avatar.url) {
                throw new ApiError(400, "Error while uploading avatar");
            }
            const user = await User.findByIdAndUpdate(
                req.user._id,
                {
                    $set: {
                        avatar: avatar.url
                    }
                },
                { new: true }
            ).select("-password");
            return res
                .status(200)
                .json(new ApiResponse(200, user, "Avatar updated successfully"));
        } catch (error) {
            throw new ApiError(400, "Error while uploading avatar");
        }
    });
});

const deleteOldAvatar = asyncHandler(async (req, res, next) => {
    const user = await user.findById(req.user._id)

    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const oldAvatarUrl = user.oldAvatarUrl;
    if (oldAvatarUrl) {
        try {
            await cloudinary.v2.uploader.destroy(oldAvatarUrl);
        }
        catch (error) {
            throw new ApiError(500, "Error deleting old avatar");
        }
    }
    next();
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    await deleteOldCoverImage(req, res, async () => {
        const coverImageLocalPath = req.file?.path;
        if (!coverImageLocalPath) {
            throw new ApiError(400, "Cover image file is missing");
        }
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage.url) {
            throw new ApiError(400, "Error while uploading cover image");
        }
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    coverImage: coverImage.url
                }
            },
            { new: true }
        ).select("-password");
        return res
            .status(200)
            .json(new ApiResponse(200, user, "Cover image updated successfully"));
    });
});

const deleteOldCoverImage = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const oldCoverImageUrl = user.coverImageUrl;
    if (oldCoverImageUrl) {
        try {
            await cloudinary.v2.uploader.destroy(oldCoverImageUrl);
        }
        catch (error) {
            throw new ApiError(500, "Error deleting old cover image");
        }
    }
    next();
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
            }
        }
    ])
    
    if(!channel?.length){
        throw new ApiError(404, "Channel not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
})

const getUserWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username:1,
                                        fullName: 1,
                                        avatar: 1,
                                        coverImage: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }  
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "User watch history fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}