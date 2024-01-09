import jwt from 'jsonwebtoken'
import { employeeModel } from "../../models/employeeModel.js";
import { deleteImage, getSingleImage, imageUpload } from '../../middleware/imageUploadS3.js';

export const fetchEmployeebyId = async (req, res, next) => {
    const employeeId = req.user.id;
    try {
        const employeeDetails = await employeeModel.findById(employeeId);
        const employeeDetail = await getSingleImage(employeeDetails)
        return res.status(200).json({ success: true, employeeDetail });
    } catch (error) {
        next(error);
    }
};

export const editEmpProfile = async (req, res, next) => {
    const employeeId = req.user.id;
    const imageName = req.file;
    console.log(req.body, 'req.body');
    const {
        firstName,
        lastName,
        email,
        position,
        phoneNumber,
        dob,
        accountHolderName,
        accountNumber,
        bankName,
        branch,
        IFSCcode,
        upiId,
    } = req.body;

    try {
        const existingEmployeeDetails = await employeeModel.findById(employeeId);
        // if (existingEmployeeDetails.imageUrl) {
        //     await deleteImage({ imageUrl: existingEmployeeDetails.imageUrl });
        // }

        let imageUrl = null;
        if (imageName) {
            imageUrl = await imageUpload(imageName)
        }

        const updateFields = {
            firstName,
            lastName,
            email,
            position,
            phoneNumber,
            dob,
            bankAccount: {
                accountHolderName,
                accountNumber,
                bankName,
                branch,
                IFSCcode,
                upiId,
            },
        };
        if (imageUrl) {
            updateFields.imageUrl = imageUrl;
        }

        const employeeDetails = await employeeModel.findByIdAndUpdate(
            employeeId,
            updateFields,
            { new: true }
        );
        const employeeDetail = await getSingleImage(employeeDetails);

        return res.status(200).json({ success: true, employeeDetail, message: 'Profile has successfully edited' });
    } catch (error) {
        next(error);
    }
};

export const newRefreshToken = async (req, res, next) => {
    const refreshToken = req.headers.authorization;
    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing refresh token' });
    }

    const [, token] = refreshToken.split(' ')
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ success: false, message: 'Forbidden: Refresh token has expired' });
            }
            return res.status(403).json({ success: false, message: 'Forbidden: Invalid refresh token' });
        }

        const newAccessToken = jwt.sign({
            id: user.id,
        },
            process.env.SECRET_KEY,
            { expiresIn: '1d', }
        );
        return res.json({ success: true, newAccessToken })
    });
};