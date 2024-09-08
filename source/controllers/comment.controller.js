import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const getVideoComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query;

    const video = await Video.finfById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }


    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.objectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "comment",
                as: "likes"
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
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likeCount: 1,
                owner: {
                    username: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const comment = await Comment.aggregatePaginate(
        commentAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comment fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    const { content } = req.body;
    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    });
    if (!comment) {
        throw new ApiError(500, "Something went wrong while creating comment");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this comment");
    }

    const updateComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content
            }
        },
        { new: true }
    );

    if (!updateComment) {
        throw new ApiError(500, "Something went wrong while updating comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updateComment, "Comment updated successfully")
        );
});

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this comment");
    }

    await Comment.findOneAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { commentId }, "Comment deleted successfully"));
});

export {
    getVideoComment,
    addComment,
    updateComment,
    deleteComment
}