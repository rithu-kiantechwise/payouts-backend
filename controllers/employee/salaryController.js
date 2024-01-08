import { reimbursementModel } from '../../models/reimbursementModel.js';
import { imageUpload } from '../../middleware/imageUploadS3.js';
import { employeeModel } from '../../models/employeeModel.js';
import { attendanceModel } from '../../models/attendanceModel.js';

export const newReimbursement = async (req, res, next) => {
    const employeeId = req.user.id;
    const imageName = req.file;
    const { description, amount } = req.body;
    try {
        let imageUrl = null;
        if (imageName) {
            imageUrl = await imageUpload(imageName)
        }
        const updateFields = {
            employeeId,
            description,
            amount,
        };
        if (imageUrl) {
            updateFields.imageUrl = imageUrl;
        }
        const reimbursement = new reimbursementModel(updateFields);

        await reimbursement.save();
        return res.status(200).json({ success: true, reimbursement, message: 'Your claim has successfully registered' });
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
export const getMonthlySalaryDetails = async (req, res, next) => {
    const employeeID = req.user.id;
    const { page } = req.query;

    try {
        const employee = await employeeModel.findById(employeeID);
        const uniqueMonths = await getUniqueMonthsForEmployee(employee._id);

        const limit = 10; // Adjust the default limit as needed
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedMonths = uniqueMonths.slice(startIndex, endIndex);

        const salaryDetailsByMonth = [];

        for (const month of paginatedMonths) {
            const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
            const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));

            const reimbursements = await reimbursementModel.find({
                employeeId: employee._id,
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
            salaryDetailsByMonth,
        });
    } catch (error) {
        next(error);
    }
};