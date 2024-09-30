import { v2 as cloudinary } from "cloudinary"
import fs, { unlinkSync } from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        fs.unlinkSync(localFilePath);

        return response.secure_url;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.error("Error uploading to Cloudinary:", error);
        return null;
    }
};


const deleteOnCloudinary = async (req, res) => {

    try {
        const { public_id } = req.params;
        if(!public_id){
            return null;
        }

        const response = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`
        });
        
    } catch (error) {
        console.log("delele on cloudinary failed!",error);
    }
}

export { 
    uploadOnCloudinary,
    deleteOnCloudinary
 }