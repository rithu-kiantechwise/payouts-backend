import { employeeModel } from "../../models/employeeModel.js";
import { attendanceModel } from '../../models/attendanceModel.js';
import { sendMail } from '../../middleware/nodemailer.js';

export const handleCheckin = async (req, res, next) => {
    const userId = req.user.id;

    try {
        const existingCheckIn = await attendanceModel.findOne({ userId, checkOutTime: { $exists: false } });

        if (existingCheckIn) {
            return res.status(401).json({ success: false, message: 'User has already checked In' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000);

        const employeeData = await employeeModel.findById(userId);

        const subject = 'OTP for daily Login';
        const text = `Your OTP for daily login is: ${otp}`;
        const result = await sendMail(
            `${employeeData?.firstName} ${employeeData?.lastName} <${employeeData.email}>`,
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

export const verifyCheckinOTP = async (req, res, next) => {
    const userId = req.user.id;

    try {
        const checkInTime = new Date();
        const newAttendance = new attendanceModel({
            userId,
            checkInTime,
        });
        await newAttendance.save();

        return res.json({ success: true, message: 'OTP verified successfully.' });
    } catch (error) {
        next(error);
    }
};

export const handleCheckout = async (req, res, next) => {
    const userId = req.user.id;

    try {
        const attendanceRecord = await attendanceModel.findOne({ userId, checkOutTime: null });
        if (!attendanceRecord) {
            return res.status(404).json({ success: false, message: 'No Attendance record found.' });
        }
        if (attendanceRecord.checkOutTime) {
            return res.status(401).json({ success: false, message: 'User has already checked out.' });
        }
        const checkOutTime = new Date();
        await attendanceModel.findOneAndUpdate({ userId, checkOutTime: null }, { checkOutTime });

        return res.json({ success: true, message: 'Checkout Successful' });
    } catch (error) {
        next(error);
    }
};

export const getAttendanceDetails = async (req, res, next) => {
    const employeeID = req.user.id;
    const { page } = req.query;
    const limit = 10;

    try {
        const totalItems = await attendanceModel.countDocuments({ userId: employeeID });

        const attendanceDetails = await attendanceModel
            .find({ userId: employeeID })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const formattedAttendanceDetails = attendanceDetails.map(attendanceRecord => {
            const date = attendanceRecord.createdAt.toISOString().split('T')[0];
            const checkInTime = attendanceRecord.checkInTime ? attendanceRecord.checkInTime : '';
            const checkOutTime = attendanceRecord.checkOutTime ? attendanceRecord.checkOutTime : '';

            let totalWorkedHours = 'Not calculated';
            if (attendanceRecord.checkInTime && attendanceRecord.checkOutTime) {
                const checkIn = attendanceRecord.checkInTime.getTime();
                const checkOut = attendanceRecord.checkOutTime.getTime();
                const millisecondsWorked = checkOut - checkIn;
                const hoursWorked = millisecondsWorked / (1000 * 60 * 60);
                totalWorkedHours = hoursWorked.toFixed(2) + ' hours';
            }

            return {
                date,
                checkInTime,
                checkOutTime,
                totalWorkedHours,
            };
        });

        const totalPages = Math.ceil(totalItems / limit);
        return res.status(200).json({
            success: true,
            currentPage: page,
            totalItems,
            totalPages,
            attendanceDetails: formattedAttendanceDetails,
        });
    } catch (error) {
        next(error);
    }
};
