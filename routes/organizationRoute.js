import { Router } from "express";
import { authenticateToken } from "../jwt/authenticateToken.js";
import { upload } from "../middleware/imageUploadS3.js";
import { freeTrialRegister, handleSuccessfulPayment, handlecancelledPayment, newOrganizationOTP, organizationLogin, premiumPayment, premiumRegister } from "../controllers/organization/authController.js";
import { editOrgProfile, fetchOrganizationbyId, orgForgotPassword, orgResetPassword } from "../controllers/organization/organizationController.js";
import { createEmployee, deleteEmployee, getAllEmployees, getAllEmployeesLeaveDetails, getEmployeeAttendance, getEmployeeById, manageLeaveStatus, updateEmployee } from "../controllers/organization/empManageController.js";
import { getAllReimbursements, updateAllEmployeesTaxes, updateReimbursementStatus, updateSelectedEmployeesTaxes } from "../controllers/organization/salaryController.js";

const router = Router();

router.post('/organization-login', organizationLogin);
router.post('/organization-register', premiumRegister);
router.post('/free-register', freeTrialRegister);
router.post('/premium-register', handleSuccessfulPayment);
router.post('/cancel-register', handlecancelledPayment);
router.post('/forgot-password', orgForgotPassword);
router.post('/reset-password', orgResetPassword);
router.post('/send-otp', newOrganizationOTP);

router.get('/fetch-organization', authenticateToken, fetchOrganizationbyId)
router.get('/all-employees', authenticateToken, getAllEmployees);
router.get('/get-attendance', authenticateToken, getEmployeeAttendance);
router.get('/employee-details/:employeeID', authenticateToken, getEmployeeById);
router.get('/get-reimbursement', authenticateToken, getAllReimbursements)
router.put('/update-reimbursement', authenticateToken, updateReimbursementStatus)
router.get('/get-leaves', authenticateToken, getAllEmployeesLeaveDetails)
router.put('/update-leave', authenticateToken, manageLeaveStatus)

router.post('/update-selected-taxes',authenticateToken, updateSelectedEmployeesTaxes);
router.post('/update-all-taxes',authenticateToken, updateAllEmployeesTaxes);

router.post('/create-employee', authenticateToken, createEmployee);
router.post('/edit-Profile', authenticateToken, upload.single('image'), editOrgProfile);
router.post('/checkout-payment', premiumPayment);

router.put('/update-employee/:id', authenticateToken, updateEmployee);

router.delete('/delete-employee/:employeeID', authenticateToken, deleteEmployee);

export default router;