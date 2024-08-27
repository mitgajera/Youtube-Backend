import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

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

    const signedAccessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '15s'
    });

    try {
        await res.cookie('accessToken', signedAccessToken, {
            httpOnly: true,
            secure: true
        });
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Error setting access token cookie");
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
                    user: loggedInUser, accessToken: signedAccessToken,
                    refreshToken: refreshTokenValue,
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
            $set: {
                refreshToken: undefined
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

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
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
        .json(200, req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
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
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error ehile uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(200, user, "Avatar updated successfully")
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error ehile uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
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
        .json(200, user, "Cover image updated successfully")
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
    updateUserCoverImage
}