import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { organizationModel } from '../../models/organizationModel.js';
import { sendMail } from '../../middleware/nodemailer.js';
import { deleteImage, getSingleImage, imageUpload } from '../../middleware/imageUploadS3.js';
import { notificationModel } from '../../models/notificationmodel.js';

export const fetchOrganizationbyId = async (req, res, next) => {
    const organizationId = req.user.id;
    try {
        const organizationDetails = await organizationModel.findById(organizationId);
        if (!organizationDetails) {
            return res.status(404).json({ success: false, error: 'Organization not found', message: 'Organization not found' });
        }
        const organizationDetail = await getSingleImage(organizationDetails);
        return res.status(200).json(organizationDetail);
    } catch (error) {
        next(error);
    }
};

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

export const editOrgProfile = async (req, res, next) => {
    const organizationId = req.user.id;
    const { name, email, location, phoneNumber } = req.body;
    const imageName = req.file;

    try {
        const existingOrganizationDetails = await organizationModel.findById(organizationId);

        // if (existingOrganizationDetails.imageUrl) {
        //     await deleteImage({ imageUrl: existingOrganizationDetails.imageUrl });
        // }

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

export const newRefreshToken = async (req, res, next) => {
    const refreshToken = req.headers.authorization;
    if (!refreshToken) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Missing refresh token' });
    }

    const [, token] = refreshToken.split(' ')
    if (!token) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Missing token' });
    }

    try {
        jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(406).json({ success: false, message: 'Forbidden: Refresh token has expired' });
                }
                return res.status(403).json({ success: false, message: 'Forbidden: Invalid refresh token' });
            }
            const newAccessToken = jwt.sign({
                id: user.id,
            },
                process.env.SECRET_KEY,
                { expiresIn: '7d', }
            );
            return res.status(200).json({ success: true, newAccessToken })
        });
    } catch (error) {
        next(error);
    }
};

export const fetchAnyNotification = async (req, res, next) => {
    const organizationId = req.user.id;
    try {
        const todayDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        const organizationDetails = await organizationModel.findById(organizationId).populate('employees');

        const employeeBirthday = organizationDetails.employees.filter(employee => {
            const employeeDOB = new Date(employee.dob).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
            return employeeDOB === todayDate;
        });

        if (employeeBirthday.length > 0) {
            const employeeNames = employeeBirthday.map(employee => employee.firstName);
            const existingNotification = await notificationModel.findOne({
                title: 'Birthday Notification',
                organizationId,
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(23, 59, 59, 999)) }
            });

            if (!existingNotification) {
                const notificationMessage = `Today is the birthday of ${employeeNames.join(', ')}.`;

                await notificationModel.create({
                    title: 'Birthday Notification',
                    content: notificationMessage,
                    organizationId,
                    status: false,
                });
            }
        }
        const notifications = await notificationModel.find({ organizationId: organizationId })
        return res.status(200).json({ success: true, notifications })
    } catch (error) {
        next(error);
    }
}


export const deleteNotification = async (req, res, next) => {
    const organizationId = req.user.id;
    try {
        const result = await notificationModel.deleteMany({ organizationId: organizationId });

        if (result.ok && result.deletedCount > 0) {
            return res.status(200).json({ success: true, deletedCount: result.deletedCount });
        } else {
            return res.status(404).json({ success: false, message: 'No notifications found for the specified organization.' });
        }
    } catch (error) {
        next(error);
    }
}

export const unreadNotification = async (req, res, next) => {
    const organizationId = req.user.id;
    try {
        const notifications = await notificationModel.find({ organizationId: organizationId });

        await notificationModel.updateMany(
            { organizationId: organizationId },
            { $set: { status: true } }
        );

        return res.status(200).json({ success: true, notifications });
    } catch (error) {
        next(error);
    }
}