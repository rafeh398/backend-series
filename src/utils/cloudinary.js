import { v2 as cloudinary } from 'cloudinary';
import { response } from "express";
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

 export const uploadOnCloudinary=async (localFilePath)=>{
    try {
        if (!localFilePath)  return null; //ager localfilePath ni ha to null return kr do

        //upload file
    const response=  await  cloudinary.uploader.upload(localFilePath,{
        resource_type:auto,  //img ,video
    })
    //successful upload
    console.log("cloudinary file upload",response.url);

    //ab user ko b to kuch return krna ha

    return response;
    

        
    } 
    catch (error) {
        
        //ager file upload na hu error aye to delete kr do local se(server)
        fs.unlinkSync(localFilePath)
    }

}
export {uploadOnCloudinary}