import { getGroupOfImage } from "../../middleware/imageUploadS3.js";
import { employeeModel } from "../../models/employeeModel.js";
import { notificationModel } from "../../models/notificationmodel.js";
import { organizationModel } from "../../models/organizationModel.js";
import { reimbursementModel } from "../../models/reimbursementModel.js";

export const getAllReimbursements = async (req, res, next) => {
    const organizationId = req.user.id;
    const { page } = req.query;
    try {
        const organization = await organizationModel.findById(organizationId).populate('employees');
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const employeeIds = organization.employees.map(employee => employee._id);
        const limit = 10;

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedEmployeeIds = employeeIds.slice(startIndex, endIndex);

        const totalReimbursementsCount = await reimbursementModel.countDocuments({ employeeId: { $in: paginatedEmployeeIds } });
        const reimbursements = await reimbursementModel.find({ employeeId: { $in: paginatedEmployeeIds } })
            .populate({
                path: 'employeeId',
                model: employeeModel,
                select: 'employeeID firstName lastName',
            });

        const reimbursement = await getGroupOfImage(reimbursements);

        return res.status(200).json({
            success: true,
            reimbursement,
            totalItems: totalReimbursementsCount,
            totalPages: Math.ceil(totalReimbursementsCount / limit),
            currentPage: page,
        });
    } catch (error) {
        next(error);
    }
};

export const updateReimbursementStatus = async (req, res, next) => {
    const { reimbursementId, newStatus } = req.body;
    try {
        const reimbursement = await reimbursementModel.findByIdAndUpdate(
            reimbursementId,
            { status: newStatus },
            { new: true }
        );
        if (!reimbursement) {
            return res.status(404).json({ success: false, error: 'Reimbursement not found' });
        }
        if (newStatus === 'Approved') {
            const notificationData = {
                title: 'Reimbursement Approved',
                content: `Your Reimbursement request has been approved.`,
                employeeId: reimbursement.employeeId,
                status: false,
            };

            const newNotification = new notificationModel(notificationData);
            await newNotification.save();
        }

        return res.status(200).json({ success: true, reimbursement });
    } catch (error) {
        next(error);
    }
};

export const updateSelectedEmployeesTaxes = async (req, res, next) => {
    const { _id, pf, esi, tax, bonus } = req.body;

    try {
        const updatedEmployees = await employeeModel.updateMany(
            { _id: { $in: _id } },
            { pf, esi, tax, bonus }
        );

        res.status(200).json({ success: true, updatedEmployees, message: 'Employee tax applied' });
    } catch (error) {
        next(error);
    }
};

export const updateAllEmployeesTaxes = async (req, res, next) => {
    const organizationId = req.user.id;
    const { pf, esi, tax, bonus } = req.body;

    try {
        if (pf === 0 && esi === 0 && tax === 0 && bonus === 0) {
            return res.status(400).json({ success: false, message: 'All tax values are zero, no update needed' });
        }
        const organization = await organizationModel.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        const updateQuery = {};
        if (pf !== 0) {
            updateQuery.pf = pf;
        }
        if (esi !== 0) {
            updateQuery.esi = esi;
        }
        if (tax !== 0) {
            updateQuery.tax = tax;
        }
        if (bonus !== 0) {
            updateQuery.bonus = bonus;
        }

        const updatedEmployees = await employeeModel.updateMany(
            { _id: { $in: organization.employees } },
            updateQuery
        );
        res.status(200).json({ success: true, updatedEmployees, message: 'Employee tax updated' });
    } catch (error) {
        next(error);
    }
};
const calculateReimbursementTotal = (reimbursements) => reimbursements
    .filter((reimbursement) => reimbursement.status === 'Approved')
    .reduce((total, reimbursement) => total + reimbursement.amount, 0);

const calculateDeductions = (employee) => {
    const actualSalary = parseFloat(employee.salary);
    const taxAmount = (employee.tax / 100) * actualSalary;
    const roundedTax = parseFloat(taxAmount.toFixed());
    const netSalaryBeforeDeductions = actualSalary - roundedTax;

    const esiAmount = (employee.esi / 100) * netSalaryBeforeDeductions;
    const roundedEsi = parseFloat(esiAmount.toFixed());

    const pfAmount = (employee.pf / 100) * netSalaryBeforeDeductions;
    const roundedPf = parseFloat(pfAmount.toFixed());

    const bonusAmount = employee.bonus;
    const roundedBonus = parseFloat(bonusAmount.toFixed());

    const deduction = roundedEsi + roundedPf + roundedTax;
    const roundedDeduction = parseFloat(deduction.toFixed());

    return {
        actualSalary,
        roundedDeduction,
        roundedBonus,
        netSalaryBeforeDeductions,
        roundedEsi,
        roundedPf,
        roundedTax,
    };
};

const calculateNetSalary = (deductions, totalReimbursement) => {
    const { netSalaryBeforeDeductions, roundedEsi, roundedPf, roundedBonus, roundedTax } = deductions;
    const netSalary = netSalaryBeforeDeductions - roundedEsi - roundedPf + roundedBonus + totalReimbursement;
    const roundedNetSalary = parseFloat(netSalary.toFixed());
    return roundedNetSalary;
};

export const employeeMonthlySalary = async (req, res, next) => {
    const organizationId = req.user.id;
    const { page } = req.query;

    try {
        const currentDate = new Date();
        const targetMonth = new Date(currentDate);
        targetMonth.setMonth(currentDate.getMonth() - (page - 1));

        const organization = await organizationModel.findById(organizationId).populate('employees')
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const employees = organization.employees;
        const limit = 10;
        const salaryDetailsByMonth = [];

        for (const employee of employees) {
            const joinDate = employee.createdAt;

            if (targetMonth >= joinDate) {
                const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1, 0, 0, 0, 0);
                const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

                const reimbursements = await reimbursementModel.find({
                    employeeId: { $in: [employee._id] },
                    createdAt: { $gte: startOfMonth, $lt: endOfMonth },
                });

                const deductions = calculateDeductions(employee);
                const totalReimbursement = calculateReimbursementTotal(reimbursements);
                const roundedNetSalary = calculateNetSalary(deductions, totalReimbursement);

                salaryDetailsByMonth.push({
                    month: targetMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                    employeeId: employee.employeeID,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    reimbursements,
                    ...deductions,
                    roundedNetSalary,
                });
            }
        }

        const totalItems = salaryDetailsByMonth.length;
        const totalPages = Math.ceil(employees.length / limit);

        return res.status(200).json({
            success: true,
            currentPage: page,
            totalItems,
            totalPages,
            salaryDetails: salaryDetailsByMonth,
        });
    } catch (error) {
        next(error);
    }
};
