import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { organizationModel } from '../../models/organizationModel.js';
import { generateTokens } from '../../jwt/generateToken.js';
import { getSingleImage } from '../../middleware/imageUploadS3.js';
import { sendMail } from '../../middleware/nodemailer.js';
import { paymentModel } from '../../models/paymentModel.js';

const razorpay = new Razorpay({
    key_id: 'rzp_test_qzknbOvHpQZ67N',
    key_secret: 'cxV55hXZNWmHAyQ6FGTkCyFs',
});

export const organizationLogin = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const organization = await organizationModel.findOne({ email });
        if (!organization) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password',
                error: 'Authentication failed'
            });
        }
        const passwordVerify = await bcrypt.compare(password, organization.password)
        if (!passwordVerify) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password',
                error: 'Authentication failed'
            });
        }
        if (organization.isBlocked) {
            return res.status(401).json({
                success: false,
                message: 'Restricted by admin please contact for more information.',
                error: 'Authentication failed'
            });
        }

        const { accessToken, refreshToken } = generateTokens(organization);
        await organizationModel.updateOne({ _id: organization._id }, { $set: { token: refreshToken } });
        const user = await getSingleImage(organization);

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

export const freeTrialRegister = async (req, res, next) => {
    const { name, address, location, email, phoneNumber, password } = req.body;
    try {
        const user = await organizationModel.findOne({ email });
        if (user) {
            return res.status(401).json({ success: false, message: 'User Existed Please Login' });
        }
        const freeTrialEndDate = new Date();
        freeTrialEndDate.setDate(freeTrialEndDate.getDate() + 14);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new organizationModel({
            name,
            address,
            location,
            email,
            phoneNumber,
            password: hashedPassword,
            freeTrial: {
                startDate: new Date(),
                endDate: freeTrialEndDate,
                isActive: true,
            },
        });
        await newUser.save();

        return res.status(200).json({ success: true, message: 'Organization registered successfully' });
    } catch (error) {
        next(error);
    }
};

export const newOrganizationOTP = async (req, res, next) => {
    const { name, email } = req.body;
    try {
        const otp = Math.floor(100000 + Math.random() * 900000);
        const user = await organizationModel.findOne({ email });
        if (user) {
            return res.status(401).json({ success: false, message: 'Already registered' });
        }
        const subject = 'OTP for email verification';
        const text = `Your OTP for email verification is: ${otp}`;
        const result = await sendMail(
            `${name} <${email}>`,
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

export const premiumRegister = async (req, res, next) => {
    const { name, address, location, email, phoneNumber, password, allowedEmployees } = req.body;
    try {
        const user = await organizationModel.findOne({ email });
        if (user) {
            return res.status(401).json({ success: false, message: 'User Existed Please Login' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new organizationModel({
            name,
            email,
            address,
            location,
            phoneNumber,
            allowedEmployees,
            password: hashedPassword,
        });

        const subject = 'OTP for email verification';
        const text = `Your OTP for email verification is: ${otp}`;
        const result = await sendMail(
            `${name} <${email}>`,
            subject,
            text,
        );
        if (result.success) {
            await newUser.save();
            return res.status(200).json({ success: true, otp, newUser, message: 'OTP sent successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Failed to send OTP' });
        }
    } catch (error) {
        next(error);
    }
};

export const handleSuccessfulPayment = async (req, res, next) => {
    const { organizationId } = req.body;

    try {
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

        await organizationModel.findOneAndUpdate(
            { _id: organizationId },
            {
                $set: {
                    'premium.isActive': true,
                    'premium.subscriptionStartDate': new Date(),
                    'premium.subscriptionEndDate': subscriptionEndDate,
                },
            },
            { new: true }
        );

        return res.status(200).json({ success: true, message: 'Organization registered Successful' });
    } catch (error) {
        next(error);
    }
};

export const handlecancelledPayment = async (req, res, next) => {
    const { organizationId } = req.body;

    try {
        const result = await organizationModel.deleteOne({ _id: organizationId });

        if (result.deletedCount === 1) {
            return res.status(200).json({ success: true, message: 'Payment cancelled, please re-register' });
        } else {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }
    } catch (error) {
        next(error);
    }
};

export const premiumPayment = async (req, res, next) => {
    const { email, allowedEmployees, plan } = req.body;

    try {
        const pricePerEmployee = 50;
        const planDuration = parseInt(plan, 10);
        const totalPrice = pricePerEmployee * allowedEmployees * planDuration

        const subscriptionStartDate = new Date();
        const subscriptionEndDate = new Date(subscriptionStartDate);
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + planDuration);

        const user = await organizationModel.findOne({ email });
        user.allowedEmployees = allowedEmployees;
        user.premium.subscriptionStartDate = subscriptionStartDate
        user.premium.subscriptionEndDate = subscriptionEndDate
        await user.save();

        const options = {
            amount: totalPrice * 100,
            currency: 'INR',
            receipt: crypto.randomBytes(10).toString('hex'),
        };
        const order = await razorpay.orders.create(options);
        const userData = {
            user,
            totalPrice,
            planDuration,
            subscriptionStartDate,
            subscriptionEndDate,
        }

        return res.status(200).json({ success: true, order, userData });
    } catch (error) {
        next(error);
    }
};

export const verifyPayment = async (req, res, next) => {
    const { orderId, paymentId, signature } = req.body;

    try {
        const order = await razorpay.orders.fetch(orderId);
        const generatedSignature = Razorpay.validateWebhookSignature(JSON.stringify(order), signature, '12345678');
        
        if (generatedSignature) {
            const payment = new paymentModel({
                orderId,
                paymentId,
                signature,
                amount: order.amount / 100,
            });

            await payment.save();
            res.json({ success: true, message: 'Payment successful' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }
    } catch (error) {
        next(error);
    }
};

// export const checkPremiumAccess = async (req, res, next) => {
//     const organizationId = req.user.id;
//     try {
//         // Find organization by ID
//         const organization = await organizationModel.findById(organizationId);

//         // Check if premium subscription is active
//         if (!organization.premium.isActive) {
//             return res.status(403).json({ success: false, error: "Premium subscription is required for this feature." });
//         }

//         // Check if the subscription has not expired
//         if (organization.premium.subscriptionEndDate < new Date()) {
//             return res.status(403).json({ success: false, error: "Premium subscription has expired." });
//         }

//         next();
//     } catch (error) {
//         next(error);
//     }
// };