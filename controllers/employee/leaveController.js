import { leaveModel } from "../../models/leaveModel.js";

export const newLeave = async (req, res, next) => {
    const employeeId = req.user.id;
    const { startDate, endDate, reason } = req.body;
    try {
        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        if (startDate > endDate) {
            return res.status(400).json({ success: false, message: "Invalid date range" });
        }
        const leaveData = {
            employeeId,
            startDate,
            endDate,
            reason,
        }
        const leave = new leaveModel(leaveData);
        await leave.save();
        return res.status(201).json({ success: true, leave, message: "Leave request created successfully" });
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