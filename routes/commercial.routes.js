const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  CommercialController,
  StockController,
} = require("../controllers/commercial.controller");
const multer = require("multer");
const commercialService = require("../services/commercial.service");

const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get("/catalog", CommercialController.getCatalog);
router.post("/commandes", CommercialController.postCommande);
router.get("/commandes/recent", CommercialController.listRecent);
router.get("/commandes/ref/:reference", CommercialController.getByReference);
router.get("/commandes/previous", CommercialController.getPreviousOrders);
router.get("/commandes/stats", CommercialController.getOrderStats);
router.get("/notifications", CommercialController.getNotifications);
router.put(
  "/commandes/ref/:reference/status",
  CommercialController.updateOrderStatus,
);
router.put(
  "/commandes/ref/:reference/workflow",
  CommercialController.advanceWorkflow,
);
router.get(
  "/commandes/ref/:reference/workflow/history",
  CommercialController.getWorkflowHistory,
);
router.post("/commandes/ref/:reference/lock", CommercialController.lockOrder);
router.post(
  "/commandes/ref/:reference/unlock",
  CommercialController.unlockOrder,
);
router.put(
  "/commandes/ref/:reference/versioned",
  CommercialController.updateOrderVersioned,
);
router.post(
  "/commandes/ref/:reference/duplicate",
  CommercialController.duplicateOrder,
);
router.post(
  "/ocr/process",
  upload.single("image"),
  CommercialController.processOCR,
);
router.post("/devis", CommercialController.generateDevis);
router.put(
  "/devis/ref/:reference/convert",
  CommercialController.convertDevisToCommande,
);
router.get(
  "/clients/:clientName/export/:format",
  CommercialController.exportClientData,
);
router.get("/config/analytics", CommercialController.getAnalyticsConfig);
router.get("/config/kpi-targets", CommercialController.getAnalyticsKpiTargets);
router.post("/whatsapp/send", CommercialController.sendWhatsApp);
router.get("/stock/alerts", CommercialController.getLowStockAlerts);
router.get(
  "/clients/:clientName/history",
  CommercialController.getClientHistory,
);
router.get("/clients/:clientName/stats", CommercialController.getClientStats);

// Stock AI routes
router.post(
  "/stock/ai-analyze",
  upload.single("image"),
  StockController.analyzeStockImage,
);
router.post("/stock/update-from-ai", StockController.updateStockFromAI);

// Configuration routes
router.get("/config/:type", StockController.getConfig);

module.exports = router;
