import { leaveModel } from "../../models/leaveModel.js";

export const newLeave = async (req, res, next) => {
    const employeeId = req.user.id;
    const { startDate, endDate, startTime, endTime, reason } = req.body;
    try {
        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        if (startDate > endDate) {
            return res.status(400).json({ success: false, message: "Invalid date range" });
        }
        if (startTime && endTime && startTime > endTime) {
            return res.status(400).json({ success: false, message: "Invalid time range" });
        }
        const leaveData = {
            employeeId,
            startDate,
            endDate,
            startTime,
            endTime,
            reason,
        }
        const leave = new leaveModel(leaveData);
        await leave.save();
        return res.status(201).json({ success: true, leave, message: "Leave request created successfully" });
    } catch (error) {
        next(error);
    }
};

export const getUpcomingLeaves = async (req, res, next) => {
    const employeeId = req.user.id;
    const { page } = req.query;
    const limit = 10;

    try {
        const currentDate = new Date();
        const totalItems = await leaveModel.countDocuments({
            employeeId: employeeId,
            endDate: { $gte: currentDate },
        });
        const upcomingLeaves = await leaveModel
            .find({
                employeeId: employeeId,
                endDate: { $gte: currentDate },
            })
            .sort({ startDate: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            success: true,
            currentPage: page,
            totalItems,
            totalPages,
            upcomingLeaves,
        });
    } catch (error) {
        next(error);
    }
};

export const getLeaveDetails = async (req, res, next) => {
    const employeeId = req.user.id;
    try {
        const leaves = await leaveModel.find({ employeeId })
        return res.status(200).json({ success: true, leaves });
    } catch (error) {
        next(error);
    }
};

export const fetchLeaveDetails = async (req, res, next) => {
    const { leaveId } = req.query;
    try {
        const leave = await leaveModel.findById(leaveId);
        if (leave) {
            return res.status(200).json({ success: true, leave });
        } else {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }
    } catch (error) {
        next(error);
    }
};

export const updateLeave = async (req, res, next) => {
    const { _id, startDate, endDate, startTime, endTime, reason } = req.body;

    try {
        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        if (startDate > endDate) {
            return res.status(400).json({ success: false, message: "Invalid date range" });
        }
        if (startTime && endTime && startTime > endTime) {
            return res.status(400).json({ success: false, message: "Invalid time range" });
        }

        const leave = await leaveModel.findById(_id);
        if (leave) {
            leave.startDate = startDate;
            leave.startTime = startTime;
            leave.endDate = endDate;
            leave.endTime = endTime;
            leave.reason = reason;
            leave.status = 'Pending';

            await leave.save();
            return res.status(200).json({ success: true, message: 'Leave updated successfully' });
        } else {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }
    } catch (error) {
        next(error);
    }
};

export const cancelLeave = async (req, res, next) => {
    const { leaveId } = req.body;

    try {
        const leave = await leaveModel.findById(leaveId);

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }

        if (leave.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Leave is already cancelled' });
        }

        const updatedLeave = await leaveModel.findByIdAndUpdate(
            leaveId,
            { $set: { status: 'Cancelled' } },
            { new: true }
        );

        return res.status(200).json({ success: true, updatedLeave, message: 'Leave updated successfully' });
    } catch (error) {
        next(error);
    }
};