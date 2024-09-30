import mongoose, { isValidObjectId } from "mongoose";
import { Community } from "../models/community.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const createPost = asyncHandler(async (req, res) => {
    const { postId } = req.params
    let { content, thumbnail } = req.body;
    console.log(postId);
    

    if (!postId || typeof postId !== 'string') {
        throw new ApiError(400, "Post id is required and must be a string");
    }

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post id");
    }
    
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        const thumbnailLocalPath = req.files.thumbnail[0].path;
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    } else {
        thumbnail = null;
    }

    const post = await Community.create({
        content,
        postId,
        thumbnail,
        owner: req.user?._id,
    });

    if (!post) {
        throw new ApiError(500, "Something went wrong while creating post");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                post,
                "Post created successfully"
            )
        );
});


const updatePost = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { postId } = req.params;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }
    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post id");
    }

    const post = await Community.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    if (post.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this post");
    }

    let thumbnailLocalPath;
    let thumbnail;

    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    } else {
        thumbnail = post.thumbnail;
    }

    const newPost = await Community.findByIdAndUpdate(
        post._id,
        {
            $set: {
                content,
                thumbnail,
            },
        },
        { new: true }
    );

    if (!newPost) {
        throw new ApiError(500, "Something went wrong while updating post");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newPost,
                "Post updated successfully"
            )
        );
});;

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post id");
    }

    const post = await Community.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    if (post.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this post");
    }

    await Community.findByIdAndDelete(postId);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                postId,
                "Post deleted successfully"
            )
        );
});

const getUserPost = asyncHandler(async (req, res) => {

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const post = await Community.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $match: {
                thumbnail: { $ne: null },
                thumbnail: { $ne: "" },
                content: { $ne: null },
                content: { $ne: "" }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likesDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likesDetails"
                },
                ownerDetails: {
                    $first: "$ownerDetails"
                },
                likedBy: {
                    $cond: {
                        if: {
                            $in: [
                                req.user?._id,
                                "$likesDetails.likedBy"
                            ]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                thumbnail: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                post,
                "Post fetched successfully"
            )
        );
})

export {
    createPost,
    updatePost,
    deletePost,
    getUserPost
}