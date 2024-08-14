import { v2 as cloudinary } from "clodinary"
import fs from fs

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null

        const responce = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })

        console.log("File is uploaded on cloudinary", responce.url);
        return responce.url;
    }catch(error){
        fs.unlinkSync(localFilePath)
        return null
    }
}

cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
    { public_id: 'shoes', },
    function (error, result) { console.log(result); })