import { Router } from "express";
import { adminForgotPassword, adminLogin, adminResetPassword, getAdminDetails, registerAdmin } from "../controllers/admin/authController.js";
import { authenticateToken } from "../jwt/authenticateToken.js";
import { addNewOrganization, blockOrganization, getAllOrganization, unblockOrganization } from "../controllers/admin/orgManageController.js";
import { newRefreshToken } from "../controllers/admin/adminController.js";

const router = Router();

router.post('/admin-login', adminLogin);
router.post('/admin-register', registerAdmin);
router.post('/forgot-password', adminForgotPassword);
router.post('/reset-password', adminResetPassword);

router.get('/fetch-admin',authenticateToken, getAdminDetails);
router.get('/fetch-organization', authenticateToken, getAllOrganization);
router.put('/block-organization', authenticateToken, blockOrganization);
router.put('/unblock-organization', authenticateToken, unblockOrganization);
router.post('/add-organization', authenticateToken, addNewOrganization);

router.post('/refresh-token',newRefreshToken);

export default router;