import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
        } catch (err) {
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

export { registerUser } 