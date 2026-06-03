const commercialService = require("../services/commercial.service");

class CommercialController {
  static async getCatalog(req, res) {
    try {
      const { items, warnings } = await commercialService.buildCatalog();
      res.json({ items, warnings, generatedAt: new Date().toISOString() });
    } catch (e) {
      console.error("getCatalog", e);
      res.status(500).json({ error: e.message || "Erreur catalogue" });
    }
  }

  static async postCommande(req, res) {
    try {
      const source = req.body.reference_manuelle ? "scan" : "app";
      const userId = req.user?.id || null;
      const payload = { ...req.body, created_by: userId };
      const result = await commercialService.createCommande(payload, source);
      res.status(201).json({ success: true, data: result, ...result });
    } catch (e) {
      const status =
        e.message &&
        (e.message.includes("insuffisant") ||
          e.message.includes("obligatoires"))
          ? 400
          : e.message && e.message.includes("existe déjà")
            ? 409
            : 400;
      res.status(status).json({ success: false, error: e.message });
    }
  }

  static async getByReference(req, res) {
    try {
      const ref = req.params.reference;
      const row = await commercialService.findByReference(ref);
      if (!row) return res.status(404).json({ error: "Bon introuvable" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async listRecent(req, res) {
    try {
      const rows = await commercialService.listRecent(req.query.limit);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getPreviousOrders(req, res) {
    try {
      const userId = req.user?.id || req.body.userId;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const orders = await commercialService.getPreviousOrders(
        userId,
        limit,
        offset,
      );
      res.json(orders);
    } catch (e) {
      console.error("getPreviousOrders", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur récupération commandes" });
    }
  }

  static async getOrderStats(req, res) {
    try {
      const userId = req.user?.id || req.body.userId;
      const stats = await commercialService.getOrderStats(userId);
      res.json(stats);
    } catch (e) {
      console.error("getOrderStats", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur récupération statistiques" });
    }
  }

  static async getNotifications(req, res) {
    try {
      const limit = parseInt(req.query.limit, 10) || 15;
      const notifications = await commercialService.getNotifications(limit);
      res.json({ notifications });
    } catch (e) {
      console.error("getNotifications", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur récupération notifications" });
    }
  }

  static async getAnalyticsConfig(req, res) {
    try {
      res.json({
        defaultTimeRange: "30",
        autoRefresh: true,
        refreshInterval: 30000,
        timeRanges: [
          { value: "7", label: "7 jours" },
          { value: "30", label: "30 jours" },
          { value: "90", label: "90 jours" },
        ],
      });
    } catch (e) {
      console.error("getAnalyticsConfig", e);
      res.status(500).json({ error: e.message || "Erreur config analytics" });
    }
  }

  static async getAnalyticsKpiTargets(req, res) {
    try {
      res.json({
        sales: 100000,
        orders: 250,
        clients: 80,
      });
    } catch (e) {
      console.error("getAnalyticsKpiTargets", e);
      res.status(500).json({ error: e.message || "Erreur KPI targets" });
    }
  }

  static async getClientHistory(req, res) {
    try {
      const clientName = req.params.clientName;
      const limit = parseInt(req.query.limit) || 20;
      const history = await commercialService.getClientHistory(
        clientName,
        limit,
      );
      res.json(history);
    } catch (e) {
      console.error("getClientHistory", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur récupération historique client" });
    }
  }

  static async getClientStats(req, res) {
    try {
      const clientName = req.params.clientName;
      const stats = await commercialService.getClientStats(clientName);
      res.json(stats);
    } catch (e) {
      console.error("getClientStats", e);
      res.status(500).json({
        error: e.message || "Erreur récupération statistiques client",
      });
    }
  }

  static async updateOrderStatus(req, res) {
    try {
      const reference = req.params.reference;
      const { statut } = req.body;
      const validStatuses = [
        "brouillon",
        "en_attente",
        "validée",
        "en_production",
        "livrée",
        "annulée",
      ];

      if (!validStatuses.includes(statut)) {
        return res.status(400).json({ error: "Statut invalide" });
      }

      const updated = await commercialService.updateOrderStatus(
        reference,
        statut,
      );
      res.json(updated);
    } catch (e) {
      console.error("updateOrderStatus", e);
      res.status(500).json({ error: e.message || "Erreur mise à jour statut" });
    }
  }

  static async advanceWorkflow(req, res) {
    try {
      const reference = req.params.reference;
      const { step } = req.body;
      const userId = req.user?.id || req.body.userId;

      const updated = await commercialService.advanceWorkflowStep(
        reference,
        userId,
        step,
      );
      res.json(updated);
    } catch (e) {
      console.error("advanceWorkflow", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur avancement workflow" });
    }
  }

  static async getWorkflowHistory(req, res) {
    try {
      const reference = req.params.reference;
      const history = await commercialService.getWorkflowHistory(reference);
      res.json(history);
    } catch (e) {
      console.error("getWorkflowHistory", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur historique workflow" });
    }
  }

  static async getLowStockAlerts(req, res) {
    try {
      const { items, warnings } = await commercialService.buildCatalog();
      const lowStockItems = items.filter(
        (item) => item.alert_level !== "normal",
      );
      res.json({
        low_stock: lowStockItems.filter(
          (item) => item.alert_level === "warning",
        ),
        out_of_stock: lowStockItems.filter(
          (item) => item.alert_level === "critical",
        ),
        total: lowStockItems.length,
      });
    } catch (e) {
      console.error("getLowStockAlerts", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur récupération alertes stock" });
    }
  }

  static async lockOrder(req, res) {
    try {
      const reference = req.params.reference;
      const userId = req.user?.id || req.body.userId;
      const locked = await commercialService.lockOrder(reference, userId);
      res.json(locked);
    } catch (e) {
      console.error("lockOrder", e);
      res
        .status(409)
        .json({ error: e.message || "Erreur verrouillage commande" });
    }
  }

  static async unlockOrder(req, res) {
    try {
      const reference = req.params.reference;
      const userId = req.user?.id || req.body.userId;
      const unlocked = await commercialService.unlockOrder(reference, userId);
      res.json(unlocked);
    } catch (e) {
      console.error("unlockOrder", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur déverrouillage commande" });
    }
  }

  static async updateOrderVersioned(req, res) {
    try {
      const reference = req.params.reference;
      const { updates, expectedVersion } = req.body;
      const userId = req.user?.id || req.body.userId;
      const updated = await commercialService.updateOrderWithVersion(
        reference,
        updates,
        expectedVersion,
        userId,
      );
      res.json(updated);
    } catch (e) {
      console.error("updateOrderVersioned", e);
      res
        .status(409)
        .json({ error: e.message || "Erreur mise à jour versionnée" });
    }
  }

  static async duplicateOrder(req, res) {
    try {
      const reference = req.params.reference;
      const { newClientName } = req.body;
      const duplicated = await commercialService.duplicateOrder(
        reference,
        newClientName,
      );
      res.status(201).json(duplicated);
    } catch (e) {
      console.error("duplicateOrder", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur duplication commande" });
    }
  }

  static async processOCR(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier fourni" });
      }

      const extractedData = await commercialService.processOCR(req.file);
      res.json(extractedData);
    } catch (e) {
      console.error("processOCR", e);
      res.status(500).json({ error: e.message || "Erreur traitement OCR" });
    }
  }

  static async generateDevis(req, res) {
    try {
      const devis = await commercialService.generateDevis(req.body);
      res.status(201).json(devis);
    } catch (e) {
      console.error("generateDevis", e);
      res.status(500).json({ error: e.message || "Erreur génération devis" });
    }
  }

  static async convertDevisToCommande(req, res) {
    try {
      const reference = req.params.reference;
      const commande =
        await commercialService.convertDevisToCommande(reference);
      res.json(commande);
    } catch (e) {
      console.error("convertDevisToCommande", e);
      res.status(500).json({ error: e.message || "Erreur conversion devis" });
    }
  }

  static async exportClientData(req, res) {
    try {
      const { clientName, format } = req.params;
      const data = await commercialService.getClientDataForExport(clientName);

      if (format === "excel") {
        // Excel export logic
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${clientName}_data.xlsx"`,
        );
        // TODO: Implement Excel generation using a library like exceljs
        res.json({ message: "Excel export not yet implemented", data });
      } else if (format === "pdf") {
        // PDF export logic
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${clientName}_data.pdf"`,
        );
        // TODO: Implement PDF generation using a library like pdfkit or puppeteer
        res.json({ message: "PDF export not yet implemented", data });
      } else {
        res.status(400).json({ error: "Format non supporté" });
      }
    } catch (e) {
      console.error("exportClientData", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur export données client" });
    }
  }

  static async sendWhatsApp(req, res) {
    try {
      const { reference, phoneNumber, montant, nomClient } = req.body;

      // Create WhatsApp message with reference and montant
      const message = `
Bonjour ${nomClient || "Client"},

Votre commande ${reference}
a été enregistrée.

Montant HT : ${montant ? parseFloat(montant).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "N/A"} DH

Merci.
      `.trim();

      // In production, integrate with WhatsApp Business API
      // For now, return a WhatsApp URL that opens the app/web with the pre-filled message
      // Normalize phone: keep digits only and convert local Morocco numbers to international format
      let normalizedPhone = String(phoneNumber || "").replace(/\D/g, "");
      if (!normalizedPhone) {
        return res
          .status(400)
          .json({ success: false, error: "Numéro de téléphone invalide" });
      }

      // Remove leading international dial code prefix if present
      if (normalizedPhone.startsWith("00")) {
        normalizedPhone = normalizedPhone.slice(2);
      }

      // Remove redundant leading zeros
      normalizedPhone = normalizedPhone.replace(/^0+/, "");

      // Convert local Moroccan number (9 digits after removing leading zero) to international form
      if (normalizedPhone.length === 9) {
        normalizedPhone = `212${normalizedPhone}`;
      }

      // Handle numbers entered as 2120xxxxxxxxx
      if (normalizedPhone.length === 13 && normalizedPhone.startsWith("2120")) {
        normalizedPhone = `212${normalizedPhone.slice(4)}`;
      }

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(
        message,
      )}`;

      res.json({
        success: true,
        message: "WhatsApp message prepared",
        whatsappUrl,
        phone: normalizedPhone,
        text: message,
      });
    } catch (e) {
      console.error("sendWhatsApp", e);
      res.status(500).json({ error: e.message || "Erreur envoi WhatsApp" });
    }
  }
}

class StockController {
  static async analyzeStockImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier fourni" });
      }

      // Real AI implementation using Google Vision API
      const vision = require("@google-cloud/vision");
      const client = new vision.ImageAnnotatorClient();

      try {
        const [result] = await client.documentTextDetection(req.file.buffer);
        const fullTextAnnotation = result.fullTextAnnotation;

        const text = fullTextAnnotation.text;

        // Parse the extracted text to extract structured data
        const extractedData = this.parseStockImageText(text);

        // Calculate confidence based on text detection
        const confidence = fullTextAnnotation.pages?.[0]?.confidence || 0;

        res.json({
          ...extractedData,
          confidence: confidence * 100,
          rawText: text,
        });
      } catch (visionError) {
        console.error("Google Vision API error:", visionError);

        // Fallback to basic OCR with Tesseract if Google Vision fails
        const Tesseract = require("tesseract.js");
        const {
          data: { text, confidence },
        } = await Tesseract.recognize(req.file.buffer, "fra");

        const extractedData = this.parseStockImageText(text);

        res.json({
          ...extractedData,
          confidence: confidence || 0,
          rawText: text,
        });
      }
    } catch (e) {
      console.error("analyzeStockImage", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur analyse image stock" });
    }
  }

  static parseStockImageText(text) {
    const lines = text.split("\n").filter((line) => line.trim());

    // Initialize default values
    let product = "Bois";
    let pieces = 0;
    let volume = 0;
    let length = 0;
    let width = 0;
    let woodType = "";
    let quality = "";

    // Parse each line to extract information
    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();

      // Extract product type
      if (lowerLine.includes("bois") || lowerLine.includes("wood")) {
        const match = line.match(/(?:bois|wood)\s*(.+)/i);
        if (match) product = match[1].trim();
      }

      // Extract pieces count
      if (
        lowerLine.includes("pièce") ||
        lowerLine.includes("piece") ||
        lowerLine.includes("pcs")
      ) {
        const match = line.match(/(\d+)\s*(?:pièces|pcs|pieces)/i);
        if (match) pieces = parseInt(match[1]);
      }

      // Extract volume
      if (
        lowerLine.includes("volume") ||
        lowerLine.includes("m³") ||
        lowerLine.includes("m3")
      ) {
        const match = line.match(/(?:volume)?\s*(\d+\.?\d*)\s*(?:m³|m3)/i);
        if (match) volume = parseFloat(match[1]);
      }

      // Extract dimensions (length x width)
      const dimMatch = line.match(/(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)/i);
      if (dimMatch) {
        length = parseFloat(dimMatch[1]);
        width = parseFloat(dimMatch[2]);
      }

      // Extract wood type
      if (
        lowerLine.includes("chêne") ||
        lowerLine.includes("hêtre") ||
        lowerLine.includes("pin")
      ) {
        if (lowerLine.includes("chêne")) woodType = "Chêne";
        else if (lowerLine.includes("hêtre")) woodType = "Hêtre";
        else if (lowerLine.includes("pin")) woodType = "Pin";
      }

      // Extract quality
      if (
        lowerLine.includes("premium") ||
        lowerLine.includes("standard") ||
        lowerLine.includes("économique")
      ) {
        if (lowerLine.includes("premium")) quality = "Premium";
        else if (lowerLine.includes("standard")) quality = "Standard";
        else if (lowerLine.includes("économique")) quality = "Économique";
      }
    });

    // Calculate volume from dimensions if not directly found
    if (volume === 0 && length > 0 && width > 0) {
      // Assume standard height of 0.1m for wood planks
      volume = length * width * 0.1;
    }

    // Default values if nothing found
    if (pieces === 0) pieces = 10;
    if (volume === 0) volume = 1.4;
    if (length === 0) length = 2.0;
    if (width === 0) width = 0.2;
    if (woodType === "") woodType = "Chêne";
    if (quality === "") quality = "Premium";

    return {
      product,
      pieces,
      volume,
      length,
      width,
      woodType,
      quality,
    };
  }

  static async updateStockFromAI(req, res) {
    try {
      const { product, pieces, volume, length, width, woodType, quality } =
        req.body;

      // Add stock movement
      const movementData = {
        product,
        pieces,
        volume,
        length,
        width,
        woodType,
        quality,
        movement_type: "entry",
        source: "ai",
        notes: "Stock entry via AI image analysis",
      };

      const commercialService = require("../services/commercial.service");
      const movement = await commercialService.addStockMovement(movementData);

      res.json({
        success: true,
        message: "Stock mis à jour avec succès",
        movement,
      });
    } catch (e) {
      console.error("updateStockFromAI", e);
      res.status(500).json({ error: e.message || "Erreur mise à jour stock" });
    }
  }

  static async getConfig(req, res) {
    try {
      const { type } = req.params;

      let config = {};

      switch (type) {
        case "time-ranges":
          config = {
            timeRanges: [
              { value: "30", label: "30 derniers jours" },
              { value: "90", label: "90 derniers jours" },
              { value: "365", label: "12 derniers mois" },
            ],
          };
          break;
        case "kpi-targets":
          config = {
            salesTarget: 100000,
            ordersTarget: 100,
            clientsTarget: 50,
          };
          break;
        case "analytics":
          config = {
            defaultTimeRange: "30",
            autoRefresh: true,
            refreshInterval: 30000,
            timeRanges: [
              { value: "30", label: "30 derniers jours" },
              { value: "90", label: "90 derniers jours" },
              { value: "365", label: "12 derniers mois" },
            ],
          };
          break;
        default:
          return res
            .status(400)
            .json({ error: "Type de configuration non supporté" });
      }

      res.json(config);
    } catch (e) {
      console.error("getConfig", e);
      res
        .status(500)
        .json({ error: e.message || "Erreur récupération configuration" });
    }
  }
}

module.exports = { CommercialController, StockController };
