import bcrypt from 'bcrypt';
import { employeeModel } from "../../models/employeeModel.js";
import { generateTokens } from '../../jwt/generateToken.js';
import { getSingleImage } from '../../middleware/imageUploadS3.js';
import { sendMail } from '../../middleware/nodemailer.js';
import { createCustomError } from '../../middleware/errorHandler.js';

export const employeeLogin = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const client = await employeeModel.findOne({ email });
        if (!client || !(await bcrypt.compare(password, client.password))) {
            throw createCustomError('Invalid username or password', 401)
        }

        const { accessToken, refreshToken } = generateTokens(client);
        await employeeModel.updateOne({ _id: client._id }, { $set: { token: refreshToken } })
        const user = await getSingleImage(client)

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

export const employeeLogout = async (req, res, next) => {
    try {
        return res.clearCookie('refreshToken', {
            httpOnly: true,
            sameSite: 'None',
            secure: true
        }).status(200)
    } catch (error) {
        next(error);
    }
};

export const empforgotPassword = async (req, res, next) => {
    const { email } = req.body;
    try {
        const otp = Math.floor(100000 + Math.random() * 900000);
        const user = await employeeModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email' });
        }

        const subject = 'OTP for reset password';
        const text = `Your OTP for reset your password is: ${otp}`;
        const result = await sendMail(
            `${user?.firstName} ${user?.lastName} <${user.email}>`,
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

export const empResetPassword = async (req, res, next) => {
    const { email, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await employeeModel.findOneAndUpdate({ email }, { password: hashedPassword });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        return res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        next(error);
    }
};