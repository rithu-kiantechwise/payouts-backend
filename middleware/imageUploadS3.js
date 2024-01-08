import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import multer from "multer";
import crypto from 'crypto';

export const storage = multer.memoryStorage()
export const upload = multer({ storage: storage })

const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const region = process.env.AWS_REGION_NAME;
const bucketName = process.env.AWS_BUCKET_NAME;

export const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    }
})

export const imageUpload = async (file) => {
    const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')
    
    try {
        const fileName = generateFileName()
        const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype
        }
        await s3Client.send(new PutObjectCommand(params));
        
        return fileName;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error("Failed to upload image");
    }
}

export const getGroupOfImage = async (datas) => {
    try {
        const updatedDatas = [];
        for (let data of datas) {
            if (data.imageUrl) {
                data.imageUrl = await getSignedUrl(
                    s3Client,
                    new GetObjectCommand({
                        Bucket: bucketName,
                        Key: data.imageUrl
                    }),
                    { expiresIn: 3600 }
                )
                updatedDatas.push(data);
            }
        }
        return updatedDatas;
    } catch (error) {
        console.error("Error getting group of images:", error);
        throw new Error("Failed to get group of images");
    }
}

export const getSingleImage = async (data) => {
    try {
        const updatedData = data ;
        if (data.imageUrl) {
            updatedData.imageUrl = await getSignedUrl(
                s3Client,
                new GetObjectCommand({
                    Bucket: bucketName,
                    Key: data.imageUrl
                }),
                { expiresIn: 3600 }
            );
        }
        return updatedData;
    } catch (error) {
        console.error("Error getting single image:", error);
        throw new Error("Failed to get single image");
    }
};

export const deleteImage = async (data) => {
    try {
        if (data.imageUrl) {
            const deleteParams = {
                Bucket: bucketName,
                Key: data.imageUrl,
            }
            await s3Client.send(new DeleteObjectCommand(deleteParams))
        }
    } catch (error) {
        console.error("Error deleting image:", error);
        throw new Error("Failed to delete image");
    }
};
