import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const communitySchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },

        content: {
            type: String,
            required: true
        },

        thumbnail: {
            type: String,
            required: true
        },
    }, 
    {
    timestamps: true
    }
)


communitySchema.plugin(mongooseAggregatePaginate)

export const Community = mongoose.model("Community", communitySchema)