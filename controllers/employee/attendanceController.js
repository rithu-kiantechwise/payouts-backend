import { employeeModel } from "../../models/employeeModel.js";
import { attendanceModel } from '../../models/attendanceModel.js';
import { sendMail } from '../../middleware/nodemailer.js';
import { leaveModel } from "../../models/leaveModel.js";

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

const calculateTotalLeaveDays = (leaves) => {
    return leaves.reduce((totalDays, leave) => {
        const timeDiff = leave.endDate.getTime() - leave.startDate.getTime();
        const days = Math.max(Math.ceil(timeDiff / (1000 * 60 * 60 * 24)), 1);

        return totalDays + days;
    }, 0);
};
const getUniqueMonthsForEmployee = async (employeeId) => {
    const uniqueMonths = await attendanceModel.aggregate([
        { $match: { userId: employeeId } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$checkInTime" } },
            },
        },
    ]);
    return uniqueMonths.map((entry) => entry._id);
};
export const getAttendanceDetails = async (req, res, next) => {
    const employeeID = req.user.id;
    const { page } = req.query;

    try {
        const employee = await employeeModel.findById(employeeID);
        const uniqueMonths = await getUniqueMonthsForEmployee(employee._id);

        const limit = 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const attendanceDetails = [];
        const paginatedMonths = uniqueMonths.slice(startIndex, endIndex);

        for (const month of paginatedMonths) {
            const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
            const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));

            const attendance = await attendanceModel.find({
                userId: employee._id,
                checkInTime: { $gte: startOfMonth, $lt: endOfMonth },
            });
            const leaves = await leaveModel.find({
                employeeId: employee._id,
                startDate: { $gte: startOfMonth, $lt: endOfMonth },
            });

            const totalLeaveDays = calculateTotalLeaveDays(leaves);
            console.log(totalLeaveDays);
            attendanceDetails.push({
                month,
                attendance,
                leaves,
                totalLeaveDays,
            });
        }

        return res.status(200).json({
            success: true,
            currentPage: page,
            totalItems: uniqueMonths.length,
            totalPages: Math.ceil(uniqueMonths.length / limit),
            attendanceDetails,
        });
    } catch (error) {
        next(error);
    }
};