import mongoose, { isValidObjectId, sanitizeFilter } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    uploadOnCloudinary,
    deleteOnCloudinary,
} from "../utils/cloudinary.js";

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description, duration } = req.body;

    if ([title, description, duration].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    let videoFileLocalPath, thumbnailLocalPath;
    if (req.files && req.files.video && req.files.video[0]) {
        videoFileLocalPath = req.files.video[0].path;
    }
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if (!videoFileLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video file and Thumbnail file are required");
    }

    const uploadedVideoFile = await uploadOnCloudinary(videoFileLocalPath);
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (uploadedVideoFile && uploadedThumbnail) {
        const video = await Video.create({
            videoFile: uploadedVideoFile,
            thumbnail: uploadedThumbnail,
            duration: duration,
            title: title,
            description: description,
            owner: req.user._id,
            isPublished: false,
        });

        if (video) {
            return res.status(201).json(
                new ApiResponse(201, video, "Video published successfully")
            );
        }
    } else {
        throw new ApiError(500, "Failed to upload video or thumbnail");
    }
});


const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy,
        sortType,
        userId
    } = req.query;

    const pipeline = [];

    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"]
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId) {
            throw new ApiError(400, "Invalid user id");
        }

        pipeline.push({
            $match: {
                "owner": mongoose.Types.ObjectId(userId)
            }
        });
    }

    pipeline.push({
        $match: {
            "status": "published"
        }
    });

    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    }
    else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
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
            $unwind: "$owenerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Videos fetched successfully"
            )
        );
})

const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!isValidObjectId(videoId) || !isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscription",
                            localField: "id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            (req.user?._id),
                                            "$subscribers.subscriber"
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
                            username: 1,
                            "avatar.url": 1,
                            subscriberCount: 1,
                            isSubscribed: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [
                                req.user?._id,
                                "$likes.likedBy"
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
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                isLiked: 1,
                likeCount: 1,
                comment: 1,
                duration: 1,
                createdAt: 1,
                owner: 1
            }
        }
    ])

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    })

    await Video.findByIdAndUpdate(videoId, {
        $addToSet: {
            watchHistory: videoId
        }
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video fetched successfully"
            )
        );
})

const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    // if (!(title) || !(description)) {
    //     throw new ApiError(400, "Title and description are required");
    // }

    const video = await Video.findByIdAndUpdate(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not allowed to update this video"
        );
    }

    const thumbnailToDelete = video.thumbnail.public_id;

    const thumbnailLocalPath = req.files.thumbnail[0].path;

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
        throw new ApiError(500, "Something went wrong while uploading thumbnail");
    }

    const updateVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail,
                isLiked: false
            }
        },
        { new: true }
    );

    if (!updateVideo) {
        throw new ApiError(500, "Something went wrong while updating video");
    }

    if (updateVideo) {
        await deleteOnCloudinary(thumbnailToDelete);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updateVideo,
                "Video updated successfully"
            )
        );
})

const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not allowed to delete this video"
        );
    }

    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    if (!videoDeleted) {
        throw new ApiError(500, "Something went wrong while deleting video");
    }

    await deleteOnCloudinary(video.thumbnail.public_id);
    await deleteOnCloudinary(video.videoFile.public_id, "video");

    await Like.deleteMany(
        {
            video: videoId
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videoDeleted,
                "Video deleted successfully"
            )
        );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            403,
            "You can't toogle publish status as you are not the owner"
        )
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        { new: true }
    );

    if (!toggledVideoPublish) {
        throw new ApiError(
            500,
            "Something went wrong while toggling publish status"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    isPublished: toggledVideoPublish.isPublished
                },
                "Publish status toggled successfully"
            )
        );
})

export {
    publishVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}