import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const alreadyLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });

    if (alreadyLiked) {
        await Like.findByIdAndDelete(alreadyLiked?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    await Like.create({
        video: videoId,
        likedBy: req.user._id
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const alreadyLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    });

    if (alreadyLiked) {
        await Like.findByIdAndDelete(alreadyLiked?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
});

const toggleCommunityLike = asyncHandler(async (req, res) => {
    const { communityId } = req.params;

    if (!isValidObjectId(communityId)) {
        throw new ApiError(400, "Invalid community id");
    }

    const alreadyLiked = await Like.findOne({
        community: communityId,
        likedBy: req.user._id
    });

    if (alreadyLiked) {
        await Like.findByIdAndDelete(likedAlready?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    await Like.create({
        community: communityId,
        likedBy: req.user._id
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, { isLiked: true }));
});

const getLikedVideos = asyncHandler(async (req, res) => {

    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: "$likedVideo"
                    },
                    {
                        $sort: {
                            createdAt: -1
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            likedVideo: {
                                _id: 1,
                                "videoFile.url": 1,
                                "thumbnail.url": 1,
                                owner: 1,
                                title: 1,
                                description: 1,
                                views: 1,
                                createdAt: 1,
                                isPublished: 1,
                                ownerDetails: {
                                    username: 1,
                                    fullName: 1,
                                    "avatar.url": 1
                                }
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosAggregate,
                "Liked videos fetched successfully"
            )

        );
});

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleCommunityLike,
    getLikedVideos
};