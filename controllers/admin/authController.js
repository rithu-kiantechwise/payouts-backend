import bcrypt from 'bcrypt';
import { adminModel } from '../../models/adminModel.js';
import { generateTokens } from '../../jwt/generateToken.js';
import { getSingleImage } from '../../middleware/imageUploadS3.js';
import { sendMail } from '../../middleware/nodemailer.js';

export const getAdminDetails = async (req, res, next) => {
    const adminId = req.user.id;
    try {
        const adminDetails = await adminModel.findById(adminId);
        const adminDetail = await getSingleImage(adminDetails);

        if (!adminDetail) {
            return res.status(404).json({ success: false, error: 'Organization not found', message: 'Organization not found' });
        }

        return res.status(200).json(adminDetail);
    } catch (error) {
        next(error);
    }
};

export const adminLogin = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }


        const { accessToken, refreshToken } = generateTokens(admin);
        await adminModel.updateOne({ _id: admin._id }, { $set: { token: refreshToken } });
        const user = await getSingleImage(admin);

        return res.status(200).cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        }).json({ success: true, user, accessToken, refreshToken, message: 'Login Successfull' });
    } catch (error) {
        next(error);
    }
};

export const registerAdmin = async (req, res, next) => {
    const { username, email, password } = req.body;
    try {
        const user = await adminModel.findOne({ email });
        if (user) {
            return res.status(401).json({ success: false, message: 'Admin Existed Please Login' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new adminModel({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();

        return res.status(200).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        next(error);
    }
};

export const adminForgotPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        const otp = Math.floor(100000 + Math.random() * 900000);
        const user = await adminModel.findOne({ email });
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

export const adminResetPassword = async (req, res, next) => {
    const { email, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await adminModel.findOneAndUpdate({ email }, { password: hashedPassword });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found', message: 'Invalid OTP' });
        }

        return res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        next(error);
    }
};