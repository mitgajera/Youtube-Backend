import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { Community } from "../models/community.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const getVideoComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }


    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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

    const comments = await Comment.aggregatePaginate(
        commentAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comment fetched successfully"));
});

const addVideoComment = asyncHandler(async (req, res) => {

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

const updateVideoComment = asyncHandler(async (req, res) => {

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

const deleteVideoComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this comment");
    }

    await Comment.findOneAndDelete(commentId);

    await Comment.deleteOne({
        comment: commentId,
        likedBy: req.user
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { commentId }, "Comment deleted successfully"));
});

const getCommunityComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const community = await Comment.findById(postId);
    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    const commentAggregate = Comment.aggregate([
        {
            $match: {
                community: new mongoose.Types.ObjectId(postId)
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
            $addFields: {
                likeCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes"] },
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
    };

    const comments = await Comment.aggregatePaginate(commentAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Community comments fetched successfully"));
});

const addCommunityComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const community = await Community.findById(postId);
    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    const comment = await Comment.create({
        content,
        post: postId,
        owner: req.user._id
    });
    if (!comment) {
        throw new ApiError(500, "Something went wrong while creating community comment");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Community comment created successfully"));
});

const updateCommunityComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.findById(postId);
    if (!comment) {
        throw new ApiError(404, "Community comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this community comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment._id,
        {
            $set: {
                content
            }
        },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(500, "Something went wrong while updating community comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Community comment updated successfully"));
});

const deleteCommunityComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Community comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this community comment");
    }

    await communityComment.findOneAndDelete(commentId);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Community comment deleted successfully"
        )
    )                                                                                                                                                                                                                                                                                                           
});

export {
        getVideoComment,
        addVideoComment,
        updateVideoComment,
        deleteVideoComment,
        getCommunityComment,
        addCommunityComment,
        updateCommunityComment,
        deleteCommunityComment
    }