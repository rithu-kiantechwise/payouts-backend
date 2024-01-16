import { getGroupOfImage } from "../../middleware/imageUploadS3.js";
import { attendanceModel } from "../../models/attendanceModel.js";
import { employeeModel } from "../../models/employeeModel.js";
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

const calculateReimbursementTotal = (reimbursements) => {
    return reimbursements
        .filter((reimbursement) => reimbursement.status === 'Approved')
        .reduce((total, reimbursement) => total + reimbursement.amount, 0);
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
export const employeeMonthlySalary = async (req, res, next) => {
    const organizationId = req.user.id;
    const { page } = req.query;

    try {
        const organization = await organizationModel.findById(organizationId).populate('employees');
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        console.log(organization, 'organization');
        const employeeIds = organization.employees.map(employee => employee._id);
        const uniqueMonths = await getUniqueMonthsForEmployee(employeeIds);
        console.log(uniqueMonths, 'uniqueMonths');
        const limit = 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedMonths = uniqueMonths.slice(startIndex, endIndex);

        const salaryDetailsByMonth = [];

        for (const month of paginatedMonths) {
            const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
            const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));

            const reimbursements = await reimbursementModel.find({
                employeeId: { $in: employeeIds },
                createdAt: { $gte: startOfMonth, $lt: endOfMonth },
            });

            const actualSalary = parseFloat(employee.salary);
            const totalReimbursement = calculateReimbursementTotal(reimbursements);

            const taxAmount = (employee.tax / 100) * actualSalary;
            const roundedTax = parseFloat(taxAmount.toFixed());
            const netSalaryBeforeDeductions = actualSalary - roundedTax;

            const esiAmount = (employee.esi / 100) * netSalaryBeforeDeductions;
            const roundedEsi = parseFloat(esiAmount.toFixed());

            const pfAmount = (employee.pf / 100) * netSalaryBeforeDeductions;
            const roundedPf = parseFloat(pfAmount.toFixed());

            const bonusAmount = employee.bonus;
            const roundedBonus = parseFloat(bonusAmount.toFixed());

            const netSalary = netSalaryBeforeDeductions - roundedEsi - roundedPf + roundedBonus + totalReimbursement;
            const roundedNetSalary = parseFloat(netSalary.toFixed());

            salaryDetailsByMonth.push({
                month,
                reimbursements,
                actualSalary,
                roundedTax,
                roundedEsi,
                roundedPf,
                roundedBonus,
                roundedNetSalary,
            });
        }

        return res.status(200).json({
            success: true,
            currentPage: page,
            totalItems: uniqueMonths.length,
            totalPages: Math.ceil(uniqueMonths.length / limit),
            salaryDetails: salaryDetailsByMonth,
        });
    } catch (error) {
        next(error);
    }
};