import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const CommentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },

        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },

        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },

        createdAt: {
            type: Date,
            default: Date.now
        },

        likes: [
            {
                type: Schema.Types.ObjectId,
                ref: "Like"
            }
        ],
    },
    {
        timestamps: true
    }
)

CommentSchema.plugins(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", CommentSchema)