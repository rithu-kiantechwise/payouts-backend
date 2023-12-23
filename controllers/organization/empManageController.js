import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { organizationModel } from '../../models/organizationModel.js';
import { employeeModel } from '../../models/employeeModel.js';
import { leaveModel } from '../../models/leaveModel.js';
import { attendanceModel } from '../../models/attendanceModel.js';
import { reimbursementModel } from '../../models/reimbursementModel.js';

export const getAllEmployees = async (req, res, next) => {
    const organizationID = req.user.id;
    const { page } = req.query;
    try {
        const organization = await organizationModel.findOne({ _id: organizationID });
        if (!organization) {
            return res.status(404).json({ success: false, error: "Organization not found" });
        }

        const employeeIDs = organization.employees;
        const limit = 10;

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedEmployeeIDs = employeeIDs.slice(startIndex, endIndex);

        const employees = await employeeModel.find({ _id: { $in: paginatedEmployeeIDs } });
        employees.reverse();

        return res.status(200).json({
            success: true,
            currentPage: page,
            totalItems: employeeIDs.length,
            totalPages: Math.ceil(employeeIDs.length / limit),
            employees,
        });
    } catch (error) {
        next(error);
    }
};

export const getEmployeeById = async (req, res, next) => {
    const { employeeID } = req.params;
    try {
        const employee = await employeeModel.findById(employeeID);
        if (!employee) {
            return res.status(404).json({ success: false, error: "Employee not found" });
        }

        return res.status(200).json(employee);
    } catch (error) {
        next(error);
    }
};

export const createEmployee = async (req, res, next) => {
    const { employeeID, firstName, lastName, email, password, phoneNumber, dob, salary, position } = req.body;
    const organizationID = req.user.id;
    try {
        const existingEmployee = await employeeModel.findOne({ email });
        if (existingEmployee) {
            return res.status(400).json({ success: false, message: 'Employee with this email already exists.' });
        }

        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        const hashedPassword = await bcrypt.hash(password, 10);

        const newEmployee = new employeeModel({
            employeeID,
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            dob,
            salary,
            position,
            token: randomNumber,
            organization: organizationID,
        });

        await newEmployee.save();

        const organization = await organizationModel.findById(organizationID);
        if (!organization) {
            return res.status(404).json({ success: false, error: 'Organization not found' });
        }

        await organizationModel.findByIdAndUpdate(organizationID, {
            $push: { employees: newEmployee._id }
        });

        return res.status(201).json({ success: true, message: 'New Employee Created', employee: newEmployee });
    } catch (error) {
        next(error);
    }
};


export const updateEmployee = async (req, res, next) => {
    try {
        const updatedEmployee = await employeeModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedEmployee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }

        return res.status(200).json({ success: true, message: 'Employee updated successfully', employee: updatedEmployee });
    } catch (error) {
        next(error);
    }
};

export const deleteEmployee = async (req, res, next) => {
    const { employeeID } = req.params;
    try {
        const deletedEmployee = await employeeModel.findOneAndDelete(employeeID);
        if (!deletedEmployee) {
            return res.status(404).json({ success: false, error: "Employee not found" });
        }

        await attendanceModel.deleteMany({ userId: deletedEmployee._id });
        await leaveModel.deleteMany({ employeeId: deletedEmployee._id });
        await reimbursementModel.deleteMany({ employeeId: deletedEmployee._id });

        const organization = await organizationModel.findOneAndUpdate(
            { employees: new mongoose.Types.ObjectId(employeeID) },
            { $pull: { employees: new mongoose.Types.ObjectId(employeeID) } },
            { new: true }
        );
        if (!organization) {
            return res.status(404).json({ success: false, error: "Organization not found" });
        }

        return res.status(200).json({ success: true, deletedEmployee, message: 'Employee deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const getAllEmployeesLeaveDetails = async (req, res,next) => {
    const organizationId = req.user.id;
    const { page } = req.query;
    try {
        const employees = await employeeModel.find({ organization: organizationId });

        const limit = 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedEmployees = employees.slice(startIndex, endIndex);
        const employeeAndLeaveDetails = await Promise.all(
            paginatedEmployees.map(async (employee) => {
                const leaveDetails = await leaveModel.find({ employeeId: employee._id });
                return { employee, leaveDetails };
            })
        );

        return res.status(200).json({
            success: true,
            currentPage: page,
            totalItems: employees.length,
            totalPages: Math.ceil(employees.length / limit),
            employeeAndLeaveDetails,
        });
    } catch (error) {
        next(error);
    }
};

export const manageLeaveStatus = async (req, res, next) => {
    try {
        const { leaveId, newStatus } = req.body;

        const updatedLeave = await leaveModel.findByIdAndUpdate(
            leaveId,
            { status: newStatus },
            { new: true }
        );

        return res.status(200).json({ success: true, updatedLeave });
    } catch (error) {
        next(error);
    }
};