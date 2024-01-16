import { Router } from "express";
import { authenticateToken } from "../jwt/authenticateToken.js";
import { upload } from "../middleware/imageUploadS3.js";
import { empResetPassword, empforgotPassword, employeeLogin, employeeLogout } from "../controllers/employee/authController.js";
import { editEmpProfile, fetchEmployeebyId, newRefreshToken } from "../controllers/employee/employeeController.js";
import { getAttendanceDetails, handleCheckin, handleCheckout, verifyCheckinOTP } from "../controllers/employee/attendanceController.js";
import { getMonthlySalaryDetails, newReimbursement } from "../controllers/employee/salaryController.js";
import { cancelLeave, fetchLeaveDetails, getLeaveDetails, getUpcomingLeaves, newLeave, updateLeave } from "../controllers/employee/leaveController.js";


const router = Router();

router.post('/employee-login', employeeLogin);
router.post('/forgot-password', empforgotPassword);
router.post('/reset-password', empResetPassword);
router.post('/employee-logout', employeeLogout);

router.post('/fetch-employee', authenticateToken, fetchEmployeebyId);
router.get('/salary-details', authenticateToken, getMonthlySalaryDetails);
router.get('/send-otp', authenticateToken, handleCheckin);

router.post('/edit-profile', authenticateToken, upload.single('image'), editEmpProfile);
router.post('/verify-otp', authenticateToken, verifyCheckinOTP);
router.post('/attendance-checkout', authenticateToken, handleCheckout);
router.post('/create-reimbursement', authenticateToken, upload.single('image'), newReimbursement);
router.post('/new-leave', authenticateToken, newLeave);
router.get('/get-leave', authenticateToken, getLeaveDetails);
router.post('/edit-leave', authenticateToken, updateLeave);
router.post('/cancel-leave', authenticateToken, cancelLeave);
router.get('/upcoming-leave', authenticateToken, getUpcomingLeaves);
router.get('/leave-details', authenticateToken, fetchLeaveDetails);
router.get('/attendance-details', authenticateToken, getAttendanceDetails);

router.post('/refresh-token',newRefreshToken);

export default router;