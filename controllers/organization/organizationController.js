import bcrypt from 'bcrypt';
import { organizationModel } from '../../models/organizationModel.js';
import { sendMail } from '../../middleware/nodemailer.js';
import { deleteImage, getSingleImage, imageUpload } from '../../middleware/imageUploadS3.js';

export const orgForgotPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        const otp = Math.floor(100000 + Math.random() * 900000);
        const user = await organizationModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found', message: 'Invalid username' });
        }

        const subject = 'OTP for reset password';
        const text = `Your OTP for reset your password is: ${otp}`;
        const result = await sendMail(
            `${user?.name} <${user.email}>`,
            subject,
            text,
        );
        if (result.success) {
            return res.status(200).json({ success: true, otp, message: 'OTP sent successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Failed to send OTP' });
        }
    } catch (error) {
        next(error);
    }
};

export const orgResetPassword = async (req, res, next) => {
    const { email, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await organizationModel.findOneAndUpdate({ email }, { password: hashedPassword });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found', message: 'Invalid OTP' });
        }

        return res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        next(error);
    }
};

export const fetchOrganizationbyId = async (req, res, next) => {
    const organizationId = req.user.id;
    try {
        const organizationDetails = await organizationModel.findById(organizationId);
        const organizationDetail = await getSingleImage(organizationDetails);

        if (!organizationDetail) {
            return res.status(404).json({ success: false, error: 'Organization not found', message: 'Organization not found' });
        }

        return res.status(200).json(organizationDetail);
    } catch (error) {
        next(error);
    }
};

export const editOrgProfile = async (req, res, next) => {
    const organizationId = req.user.id;
    const { name, email, location, phoneNumber } = req.body;
    const imageName = req.file;

    try {
        const existingOrganizationDetails = await organizationModel.findById(organizationId);

        if (existingOrganizationDetails.imageUrl) {
            await deleteImage({ imageUrl: existingOrganizationDetails.imageUrl });
        }

        let imageUrl = null;
        if (imageName) {
            imageUrl = await imageUpload(imageName);
        }
        const updateFields = {
            name,
            email,
            location,
            phoneNumber,
        };

        if (imageUrl) {
            updateFields.imageUrl = imageUrl;
        }
        const organizationDetails = await organizationModel.findByIdAndUpdate(
            organizationId,
            updateFields,
            { new: true }
        );
        const organizationDetail = await getSingleImage(organizationDetails);

        return res.status(200).json({ success: true, organizationDetail, message: 'Profile has been successfully edited' });
    } catch (error) {
        next(error);
    }
};
