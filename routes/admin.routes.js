const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

router.use(authMiddleware);

router.get('/overview', adminController.getOverview);
router.get('/analytics', adminController.getAnalytics);
router.get('/system-health', adminController.getSystemHealth);
router.get('/presence', adminController.getPresence);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/role-permissions', adminController.getRolePermissions);
router.post('/heartbeat', adminController.heartbeat);
router.post('/cache/clear', adminController.clearCache);
router.post('/force-logout/:id', adminController.forceLogout);
router.post('/password/check-strength', adminController.checkPasswordStrength);
router.post('/password/generate', adminController.generatePassword);
router.post('/2fa/setup', adminController.setupTwoFactor);
router.post('/2fa/verify-enable', adminController.verifyAndEnableTwoFactor);
router.post('/2fa/disable', adminController.disableTwoFactor);

module.exports = router;
