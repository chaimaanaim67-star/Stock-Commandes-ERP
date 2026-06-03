import React, { useState, useEffect, useMemo } from "react";
import { useSocket } from "../context/SocketContext";
import api from "../api/axiosConfig";
import { normalizePivotPosition, normalizePivotKeyPart } from "../utils/pivotZones";
import BonCommandeDocument from "../components/commercial/BonCommandeDocument";
import { exportBonPdf } from "../utils/exportBonPdf";
import { normalizeBonLignes } from "../utils/bonDocumentFormat";
import CommercialOrders from "../components/commercial/CommercialOrders";
import ClientHistory from "../components/commercial/ClientHistory";
import CRMClient from "../components/commercial/CRMClient";
import CommercialAnalytics from "../components/commercial/CommercialAnalytics";
import OCRScanner from "../components/commercial/OCRScanner";
import CommercialNotifications from "../components/commercial/CommercialNotifications";
import IntelligentSuggestions from "../components/commercial/IntelligentSuggestions";
import CommercialProductivity from "../components/commercial/CommercialProductivity";
import { PenTool } from 'lucide-react';

const formatMoney = (n) =>
  (parseFloat(n) || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CommercialView = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const [showClientHistory, setShowClientHistory] = useState(false);
  const [showCRMClient, setShowCRMClient] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');

  const [stockData, setStockData] = useState({
    columns: [],
    rows: [],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    essence: '',
    marque: '',
    qualite: '',
  });
  const [instantSearchResults, setInstantSearchResults] = useState([]);
  const [showInstantSearch, setShowInstantSearch] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  const [client, setClient] = useState({
    nom: "",
    telephone: "",
    ville: "",
    adresse: "",
    email: "",
    remarque: "",
  });

  const [modeles, setModeles] = useState([]);
  const [selectedModele, setSelectedModele] = useState("");
  const [loadingModele, setLoadingModele] = useState(false);

  const [zones, setZones] = useState({
    filters: [],
    rows: [],
    columns: [],
    values: [],
  });

  const [filterValues, setFilterValues] = useState({});
  const [pivotRowValues, setPivotRowValues] = useState({});
  const [pivotColumnValues, setPivotColumnValues] = useState({});

  const [detailRows, setDetailRows] = useState([]);
  const [detailContext, setDetailContext] = useState(null);
  const [panier, setPanier] = useState([]);
  const [bonCommande, setBonCommande] = useState(null);
  const [bonPreview, setBonPreview] = useState(null);
  const [submittingBon, setSubmittingBon] = useState(false);
  /** Prix saisis dans le détail avant / sans panier (par ligne produit). */
  const [detailPrices, setDetailPrices] = useState({});

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/stock");
      setStockData({
        columns: res.data.columns || [],
        rows: res.data.rows || [],
      });
    } catch (err) {
      console.error("ERROR FETCH STOCK => ", err);
    } finally {
      setLoading(false);
    }
  };

  // Instant search effect
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const searchLower = searchTerm.toLowerCase();
      const results = stockData.rows
        .filter(row => {
          const rowText = row.join(' ').toLowerCase();
          return rowText.includes(searchLower);
        })
        .slice(0, 10); // Limit to 10 results
      setInstantSearchResults(results);
      setShowInstantSearch(true);
    } else {
      setInstantSearchResults([]);
      setShowInstantSearch(false);
    }
  }, [searchTerm, stockData.rows]);

  const fetchModeles = async () => {
    try {
      const res = await api.get("/api/modeles/all");
      setModeles(res.data || []);
    } catch (err) {
      console.error("ERROR FETCH MODELES => ", err);
    }
  };

  useEffect(() => {
    fetchStock();
    fetchModeles();
  }, []);

  // Subscribe to backend stock updates and refresh table when received
  const { on, off } = (() => {
    try {
      return useSocket();
    } catch (e) {
      return { on: null, off: null };
    }
  })();

  useEffect(() => {
    if (!on) return;
    const handler = (data) => {
      if (!data) return;
      if (data.columns && data.rows) {
        setStockData({ columns: data.columns || [], rows: data.rows || [] });
      }
    };
    on("stock-update", handler);
    return () => {
      if (off) off("stock-update", handler);
    };
  }, [on, off]);

  const getModeleNom = (id_modele) =>
    modeles.find((m) => String(m.id_modele) === String(id_modele))?.nom_modele ||
    `Modèle #${id_modele}`;

  const panierModelesCount = useMemo(
    () => new Set(panier.map((p) => p.id_modele)).size,
    [panier]
  );

  const enrichBonData = (data) => ({
    bon: data.bon,
    lignes: normalizeBonLignes(data.lignes, getModeleNom),
  });

  const pivotData = useMemo(() => {
    if (!zones.rows.length || !zones.columns.length || !zones.values.length) {
      return {
        pivotTable: {},
        pivotRows: [],
        pivotColumns: [],
      };
    }

    const columnMap = {};
    stockData.columns.forEach((col, index) => {
      columnMap[col] = index;
    });

    const rowIndexes = zones.rows.map((field) => columnMap[field]);
    const columnIndexes = zones.columns.map((field) => columnMap[field]);
    const valueField = zones.values[0];
    const valueIndex = stockData.columns.indexOf(valueField);

    const filteredRows = stockData.rows.filter((row) => {
      // Apply search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const rowText = row.join(' ').toLowerCase();
        if (!rowText.includes(searchLower)) return false;
      }

      // Apply filters
      for (const field in filterValues) {
        const allowedValues = filterValues[field];
        if (!allowedValues?.length) continue;
        const fieldIndex = columnMap[field];
        const rowValue = row[fieldIndex];
        if (!allowedValues.some((v) => String(v) === String(rowValue)))
          return false;
      }

      for (const field in pivotRowValues) {
        const allowedValues = pivotRowValues[field];
        if (!allowedValues?.length) continue;
        const fieldIndex = columnMap[field];
        const rowValue = row[fieldIndex];
        if (!allowedValues.some((v) => String(v) === String(rowValue)))
          return false;
      }

      for (const field in pivotColumnValues) {
        const allowedValues = pivotColumnValues[field];
        if (!allowedValues?.length) continue;
        const fieldIndex = columnMap[field];
        const rowValue = row[fieldIndex];
        if (!allowedValues.some((v) => String(v) === String(rowValue)))
          return false;
      }

      // Apply custom filters (essence, marque, qualite)
      if (filters.essence) {
        const essenceIndex = columnMap['essence'];
        if (essenceIndex >= 0 && row[essenceIndex] !== filters.essence) return false;
      }
      if (filters.marque) {
        const marqueIndex = columnMap['marque'];
        if (marqueIndex >= 0 && row[marqueIndex] !== filters.marque) return false;
      }
      if (filters.qualite) {
        const qualiteIndex = columnMap['qualite'];
        if (qualiteIndex >= 0 && row[qualiteIndex] !== filters.qualite) return false;
      }

      return true;
    });

    const result = {};

    filteredRows.forEach((row) => {
      const rowKey = rowIndexes
        .map((index) => normalizePivotKeyPart(row[index]))
        .join(" | ");
      const columnKey = columnIndexes
        .map((index) => normalizePivotKeyPart(row[index]))
        .join(" | ");
      const value = parseFloat(row[valueIndex]) || 0;

      if (!result[rowKey]) result[rowKey] = {};
      if (!result[rowKey][columnKey]) {
        result[rowKey][columnKey] = { total: 0, rows: [] };
      }

      result[rowKey][columnKey].total += value;
      result[rowKey][columnKey].rows.push(row);
    });

    const pivotRows = Object.keys(result);
    const pivotColumns = Array.from(
      new Set(pivotRows.flatMap((rowKey) => Object.keys(result[rowKey])))
    );

    return { pivotTable: result, pivotRows, pivotColumns };
  }, [stockData, zones, filterValues, pivotRowValues, pivotColumnValues]);

  const { pivotTable, pivotRows, pivotColumns } = pivotData;

  const colIndex = (nameOrAliases) => {
    const cols = stockData.columns || [];
    const names = Array.isArray(nameOrAliases)
      ? nameOrAliases
      : [nameOrAliases];
    for (const name of names) {
      const i = cols.indexOf(name);
      if (i !== -1) return i;
      const lower = String(name).toLowerCase();
      const found = cols.findIndex(
        (c) => String(c).toLowerCase() === lower
      );
      if (found !== -1) return found;
    }
    return -1;
  };

  const getRowCell = (row, keys) => {
    const idx = colIndex(keys);
    if (idx < 0) return "";
    const v = row[idx];
    return v === undefined || v === null ? "" : String(v);
  };

  const handleCellDoubleClick = (rowKey, columnKey) => {
    const cellData = pivotTable[rowKey]?.[columnKey];
    if (!cellData) return;
    setDetailContext({ rowKey, columnKey });
    setDetailRows(cellData.rows);
    setDetailPrices({});
  };

  const buildDesignation = (row) => {
    const parts = [
      getRowCell(row, ["designation", "nom_produit"]),
      getRowCell(row, ["essence"]),
      getRowCell(row, ["dimension_ell", "dimension_lle"]),
      getRowCell(row, ["marque"]),
      getRowCell(row, ["qualite"]),
    ].filter(Boolean);
    if (parts.length) return parts.join(" — ");
    if (detailContext) {
      return `${detailContext.rowKey} / ${detailContext.columnKey}`;
    }
    return "Article";
  };

  const getDetailRowId = (row, rowIndex) => {
    const mid = selectedModele || "0";
    const idIdx = colIndex(["id", "id_produit", "ID"]);
    if (idIdx >= 0) {
      const v = row[idIdx];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return `m${mid}-id-${v}`;
      }
    }
    return `m${mid}-row-${rowIndex}-${detailContext?.rowKey || ""}-${detailContext?.columnKey || ""}`;
  };

  const getProduitIdFromRow = (row) => {
    const idx = colIndex(["id_produit", "id", "ID"]);
    if (idx < 0) return null;
    const v = parseInt(row[idx], 10);
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  const createPanierLineFromRow = (row, rowIndex) => {
    const rowId = getDetailRowId(row, rowIndex);
    const q = parseFloat(getRowCell(row, ["m3", "quantite"])) || 0;
    const prixRaw = detailPrices[rowId];
    return {
      lineId: `L-${rowId}`,
      rowId,
      id_produit: getProduitIdFromRow(row),
      id_modele: Number(selectedModele),
      nom_modele: getModeleNom(selectedModele),
      ligne_key: detailContext?.rowKey || "",
      col_key: detailContext?.columnKey || "",
      quantite: q > 0 ? q : 1,
      prix_unitaire_ht:
        prixRaw === undefined || prixRaw === null || prixRaw === ""
          ? ""
          : prixRaw,
      designation: buildDesignation(row),
      unite: "m³",
    };
  };

  const isRowInPanier = (row, rowIndex) =>
    panier.some((p) => p.rowId === getDetailRowId(row, rowIndex));

  const getPanierLineForRow = (row, rowIndex) =>
    panier.find((p) => p.rowId === getDetailRowId(row, rowIndex));

  const handleDetailPriceChange = (row, rowIndex, rawValue) => {
    const rowId = getDetailRowId(row, rowIndex);
    setDetailPrices((prev) => ({ ...prev, [rowId]: rawValue }));
    const existing = panier.find((p) => p.rowId === rowId);
    if (existing) {
      updatePanierLine(
        existing.lineId,
        "prix_unitaire_ht",
        rawValue === "" ? "" : rawValue
      );
    }
  };

  const handleSelectDetailRow = (row, rowIndex, checked) => {
    if (!selectedModele || !detailContext) {
      alert("Choisissez un modèle et double-cliquez une cellule du tableau.");
      return;
    }
    const rowId = getDetailRowId(row, rowIndex);
    if (checked) {
      const candidate = createPanierLineFromRow(row, rowIndex);
      setPanier((prev) =>
        prev.some((p) => p.rowId === rowId) ? prev : [...prev, candidate]
      );
    } else {
      setPanier((prev) => prev.filter((p) => p.rowId !== rowId));
    }
  };

  const updatePanierLine = (lineId, field, value) => {
    setPanier((prev) => {
      const updated = prev.map((l) =>
        l.lineId === lineId ? { ...l, [field]: value } : l
      );
      if (field === "prix_unitaire_ht") {
        const line = updated.find((l) => l.lineId === lineId);
        if (line?.rowId) {
          setDetailPrices((d) => ({ ...d, [line.rowId]: value }));
        }
      }
      return updated;
    });
  };

  const removePanierLine = (lineId) => {
    setPanier((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const panierTotals = useMemo(() => {
    let total = 0;
    const lines = panier.map((l) => {
      const q = parseFloat(l.quantite) || 0;
      const pu = parseFloat(l.prix_unitaire_ht);
      const sousTotal =
        q > 0 && pu > 0 ? Math.round(q * pu * 100) / 100 : 0;
      total += sousTotal;
      return { ...l, sous_total_ht: sousTotal };
    });
    return { lines, total: Math.round(total * 100) / 100 };
  }, [panier]);

  const validatePanierForBon = () => {
    if (!client.nom?.trim()) {
      alert("Le nom du client est obligatoire.");
      return false;
    }
    if (panier.length === 0) {
      alert("Le panier est vide.");
      return false;
    }
    for (const l of panier) {
      if (!(parseFloat(l.prix_unitaire_ht) > 0)) {
        alert(
          "Indiquez un prix (différent de 0) pour chaque produit sélectionné."
        );
        return false;
      }
    }
    return true;
  };

  const buildBonDraft = () => ({
    bon: {
      reference: "APERÇU",
      nom_client: client.nom.trim(),
      ville: client.ville || "",
      telephone: client.telephone || "",
      email: client.email || "",
      adresse: client.adresse || "",
      remarque: client.remarque || "",
      total_ht: panierTotals.total,
      statut: "brouillon",
      created_at: new Date().toISOString(),
    },
    lignes: normalizeBonLignes(
      panierTotals.lines.map((l) => ({
        ...l,
        prix_unitaire: parseFloat(l.prix_unitaire_ht) || 0,
        nom_modele: l.nom_modele || getModeleNom(l.id_modele),
      })),
      getModeleNom
    ),
  });

  const openBonPreview = () => {
    if (!validatePanierForBon()) return;
    setBonPreview(buildBonDraft());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmBon = async () => {
    if (!validatePanierForBon()) return;
    setSubmittingBon(true);
    try {
      const res = await api.post("/api/commercial/commandes", {
        nom_client: client.nom.trim(),
        ville: client.ville || "",
        telephone: client.telephone || "",
        email: client.email || "",
        adresse: client.adresse || "",
        remarque: client.remarque || "",
        statut: "en_attente",
        articles: panier.map((l) => ({
          id_modele: l.id_modele,
          id_produit: l.id_produit || undefined,
          ligne_key: l.ligne_key,
          col_key: l.col_key,
          quantite: parseFloat(l.quantite) || 0,
          prix_unitaire: parseFloat(l.prix_unitaire_ht) || 0,
          designation: l.designation,
        })),
      });
      const raw = res.data?.bon ? res.data : res.data?.data || res.data;
      setBonCommande(enrichBonData(raw));
      setBonPreview(null);
      setPanier([]);
      setDetailRows([]);
      setDetailContext(null);
      setDetailPrices({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.error ||
          "Erreur lors de la validation du bon de commande."
      );
    } finally {
      setSubmittingBon(false);
    }
  };

  const startNewCommande = () => {
    setBonCommande(null);
    setBonPreview(null);
    setPanier([]);
    setDetailRows([]);
    setDetailContext(null);
    setDetailPrices({});
  };

  const sendWhatsApp = async () => {
    if (!bonCommande?.bon?.reference) return;

    // Sanitize phone number: keep digits only (wa.me requires international format without +/spaces)
    const rawPhone = String(client.telephone || '').replace(/\D/g, '');
    if (!rawPhone) {
      alert('Numéro de téléphone du client manquant ou invalide.');
      return;
    }

    const popup = window.open('', '_blank');
    if (!popup) {
      alert("Le navigateur a bloqué l'ouverture de la fenêtre WhatsApp. Autorisez les popups puis réessayez.");
      return;
    }

    try {
      const res = await api.post("/api/commercial/whatsapp/send", {
        reference: bonCommande.bon.reference,
        phoneNumber: rawPhone,
        montant: bonCommande.bon.total_ht,
        nomClient: client.nom,
      });

      const phone = res.data?.phone;
      const text = res.data?.text;
      const url = res.data?.whatsappUrl;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
      const finalUrl = isMobile && phone && text
        ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`
        : url;

      if (finalUrl) {
        popup.location.href = finalUrl;
      } else {
        popup.close();
        alert('Impossible de générer le lien WhatsApp.');
      }
    } catch (error) {
      popup.close();
      console.error("WhatsApp error:", error);
      alert('Erreur lors de la préparation du message WhatsApp.');
    }
  };

  const handleDownloadPdf = async () => {
    const printableBon = bonCommande?.bon ? bonCommande : bonPreview;
    if (!printableBon?.bon) return;

    try {
      await exportBonPdf(printableBon.bon.reference || "bon-commande");
    } catch (err) {
      alert(err.message || "Impossible de générer le PDF.");
    }
  };

  const loadModeleConfig = async (id_modele) => {
    if (!id_modele) return;

    try {
      setLoadingModele(true);
      const res = await api.get(`/api/p_modele/config/${id_modele}`);
      const payload = res.data;
      const selections = payload?.selections || {
        filters: {},
        rows: {},
        columns: {},
      };
      const details = (payload?.details || []).sort(
        (a, b) => Number(a.ordre || 0) - Number(b.ordre || 0)
      );

      const filters = [];
      const rows = [];
      const columns = [];
      const values = [];

      const pushUnique = (arr, field) => {
        if (field && !arr.includes(field)) arr.push(field);
      };

      details.forEach((item) => {
        if (!item.variante) return;
        switch (normalizePivotPosition(item.position)) {
          case "filters":
            pushUnique(filters, item.variante);
            break;
          case "rows":
            pushUnique(rows, item.variante);
            break;
          case "columns":
            pushUnique(columns, item.variante);
            break;
          case "values":
            pushUnique(values, item.variante);
            break;
          default:
            break;
        }
      });

      Object.keys(selections.filters || {}).forEach((f) =>
        pushUnique(filters, f)
      );
      Object.keys(selections.rows || {}).forEach((f) => pushUnique(rows, f));
      Object.keys(selections.columns || {}).forEach((f) =>
        pushUnique(columns, f)
      );

      setFilterValues(selections.filters || {});
      setPivotRowValues(selections.rows || {});
      setPivotColumnValues(selections.columns || {});
      setZones({ filters, rows, columns, values });
      setDetailRows([]);
      setDetailContext(null);
      setDetailPrices({});
    } catch (err) {
      console.error("ERROR CONFIG => ", err);
      alert("Impossible de charger la configuration du modèle.");
    } finally {
      setLoadingModele(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedModele) {
      alert("Choisir un modèle");
      return;
    }
    loadModeleConfig(selectedModele);
  };

  const handlePrintBon = () => window.print();

  const panierLocked = !!bonCommande;
  const editingLocked = !!bonPreview;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl font-black text-[#4B3621]">
        Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f4ef] via-white to-[#f3eee6] p-8">
      {bonPreview && (
        <div className="fixed inset-0 z-[300] bg-black/50 overflow-y-auto p-4 md:p-8 print:relative print:inset-auto print:bg-white print:p-0">
          <div className="max-w-4xl mx-auto print:max-w-none">
            <BonCommandeDocument
              bon={bonPreview.bon}
              lignes={bonPreview.lignes}
              isPreview
              onValidate={confirmBon}
              onCancelPreview={() => setBonPreview(null)}
              onDownloadPdf={handleDownloadPdf}
              validating={submittingBon}
            />
          </div>
        </div>
      )}

      {bonCommande && !bonPreview && (
        <BonCommandeDocument
          bon={bonCommande.bon}
          lignes={bonCommande.lignes}
          onClose={startNewCommande}
          onPrint={handlePrintBon}
          onDownloadPdf={handleDownloadPdf}
          onWhatsApp={sendWhatsApp}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-5xl font-black text-[#2d1f13] tracking-tight">
            Espace Commercial
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Gestion dynamique du stock commercial
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-3xl px-8 py-5 border border-[#ede7df]">
          <div className="text-xs uppercase text-gray-400 font-bold">
            Panier · {panierModelesCount} modèle{panierModelesCount > 1 ? "s" : ""}
          </div>
          <div className="text-4xl font-black text-[#4B3621]">{panier.length}</div>
          <p className="text-[10px] text-gray-400 mt-1">articles · 1 bon client</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl p-2 mb-8 border border-[#E8E2DC] flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-[#4B3621] text-white'
              : 'text-[#4B3621] hover:bg-[#F9F7F5]'
          }`}
        >
          Nouvelle commande
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-[#4B3621] text-white'
              : 'text-[#4B3621] hover:bg-[#F9F7F5]'
          }`}
        >
          Commandes précédentes
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'analytics'
              ? 'bg-[#4B3621] text-white'
              : 'text-[#4B3621] hover:bg-[#F9F7F5]'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'notifications'
              ? 'bg-[#4B3621] text-white'
              : 'text-[#4B3621] hover:bg-[#F9F7F5]'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => {
            const clientName = (client.nom || '').trim();
            if (!clientName) {
              alert('Veuillez saisir le nom du client avant de consulter son historique.');
              return;
            }
            setSelectedClient(clientName);
            setShowClientHistory(true);
          }}
          className="px-6 py-3 rounded-xl font-bold bg-[#9DC183] text-[#4B3621] hover:opacity-90 transition-opacity"
        >
          Historique client
        </button>
        <button
          onClick={() => {
            const clientName = (client.nom || '').trim();
            if (!clientName) {
              alert('Veuillez saisir le nom du client avant d\'ouvrir la fiche CRM.');
              return;
            }
            setSelectedClient(clientName);
            setShowCRMClient(true);
          }}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#4B3621] to-[#6d5035] text-white hover:opacity-90 transition-opacity"
        >
          Fiche Client CRM
        </button>
        <button
          onClick={() => setShowOCRScanner(true)}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#9DC183] to-[#7ab36d] text-[#4B3621] hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          📷 Scanner Bon
        </button>
      </div>

      {showClientHistory && (
        <div className="fixed inset-0 z-[400] bg-black/50 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6">
            <ClientHistory
              clientName={selectedClient}
              onClose={() => setShowClientHistory(false)}
            />
          </div>
        </div>
      )}

      {showCRMClient && (
        <div className="fixed inset-0 z-[400] bg-black/50 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6">
            <CRMClient
              clientName={selectedClient}
              onClose={() => setShowCRMClient(false)}
            />
          </div>
        </div>
      )}

      {showOCRScanner && (
        <OCRScanner
          onClose={() => setShowOCRScanner(false)}
          onOrderCreated={() => {
            setShowOCRScanner(false);
            setActiveTab('orders');
          }}
        />
      )}

      {activeTab === 'orders' ? (
        <CommercialOrders />
      ) : activeTab === 'analytics' ? (
        <CommercialAnalytics />
      ) : activeTab === 'notifications' ? (
        <CommercialNotifications />
      ) : activeTab === 'productivity' ? (
        <CommercialProductivity />
      ) : (
        <>
      {!panierLocked && !editingLocked && (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#efe8df] mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
          <div className="flex-1 relative">
            {/* <label className="block text-sm font-bold text-[#4B3621] mb-2">
              Recherche
            </label> */}
            {/* <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            /> */}
            {showInstantSearch && instantSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E8E2DC] rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto">
                {instantSearchResults.map((row, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 hover:bg-[#F9F7F5] cursor-pointer border-b border-[#E8E2DC] last:border-b-0"
                    onClick={() => {
                      setSearchTerm(row.join(' '));
                      setShowInstantSearch(false);
                    }}
                  >
                    <p className="text-sm font-medium text-[#4B3621]">{row.join(' - ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* <div>
            <label className="block text-sm font-bold text-[#4B3621] mb-2">
              Essence
            </label>
            <select
              value={filters.essence}
              onChange={(e) => setFilters({ ...filters, essence: e.target.value })}
              className="bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            >
              <option value="">Toutes</option>
              <option value="Chêne">Chêne</option>
              <option value="Hêtre">Hêtre</option>
              <option value="Pin">Pin</option>
              <option value="Autre">Autre</option>
            </select>
          </div> */}
          {/* <div>
            <label className="block text-sm font-bold text-[#4B3621] mb-2">
              Marque
            </label>
            <select
              value={filters.marque}
              onChange={(e) => setFilters({ ...filters, marque: e.target.value })}
              className="bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            >
              <option value="">Toutes</option>
              <option value="Ismawood">Ismawood</option>
              <option value="Premium">Premium</option>
              <option value="Standard">Standard</option>
            </select>
          </div> */}
          {/* <div>
            <label className="block text-sm font-bold text-[#4B3621] mb-2">
              Qualité
            </label>
            <select
              value={filters.qualite}
              onChange={(e) => setFilters({ ...filters, qualite: e.target.value })}
              className="bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            >
              <option value="">Toutes</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div> */}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Choisissez un modèle, ajoutez des produits au panier, puis changez de
          modèle pour compléter la même commande client .
        </p>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select
            value={selectedModele}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedModele(id);
              if (id) loadModeleConfig(id);
            }}
            disabled={panierLocked || editingLocked}
            className="flex-1 bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
          >
            <option value="">Choisir modèle</option>
            {modeles.map((m) => (
              <option key={m.id_modele} value={m.id_modele}>
                {m.nom_modele}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            className="bg-gradient-to-r from-[#4B3621] to-[#6d5035] text-white px-8 py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 shadow-lg"
          >
            {loadingModele ? "Chargement..." : "Générer"}
          </button>
        </div>
      </div>
      )}

      {!panierLocked && !editingLocked && (
      <div className="bg-white rounded-[32px] shadow-sm border border-[#efe8df] overflow-hidden mb-10">
        <p className="px-6 pt-4 text-sm text-gray-500">
          Modèle actif :{" "}
          <strong>{selectedModele ? getModeleNom(selectedModele) : "—"}</strong>
          . Double-cliquez une cellule pour ajouter des produits au panier.
        </p>
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 px-5 py-4 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5] text-left">
                  {zones.rows.join(" / ")}
                </th>
                {pivotColumns.map((column, index) => (
                  <th
                    key={`${column}-${index}`}
                    className="sticky top-0 px-5 py-4 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5] text-center whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pivotRows.map((rowKey, rowIndex) => (
                <tr
                  key={`${rowKey}-${rowIndex}`}
                  className="hover:bg-[#faf6f1] transition-all"
                >
                  <td className="px-5 py-4 border-b border-[#f1e9df] font-bold text-[#4B3621] whitespace-nowrap bg-white">
                    {rowKey}
                  </td>
                  {pivotColumns.map((columnKey, colIdx) => (
                    <td
                      key={`${columnKey}-${colIdx}`}
                      onDoubleClick={() =>
                        handleCellDoubleClick(rowKey, columnKey)
                      }
                      className="px-5 py-4 border-b border-[#f1e9df] text-center cursor-pointer hover:bg-[#f5ede3] transition-all font-semibold text-[#3d2c1c]"
                    >
                      {pivotTable[rowKey]?.[columnKey]?.total || 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {!panierLocked && !editingLocked && detailRows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-[#efe8df] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#f1e9df]">
              <h2 className="text-2xl font-black text-[#4B3621]">
                Détail produits
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Cochez chaque produit séparément et saisissez son prix (pas de 0).
              </p>
            </div>

            <div className="overflow-auto max-h-[500px]">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky top-0 px-4 py-3 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5] w-12">
                      ✓
                    </th>
                    <th className="sticky top-0 px-4 py-3 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5] text-left">
                      Désignation
                    </th>
                    <th className="sticky top-0 px-4 py-3 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5] text-right">
                      Qté (m³)
                    </th>
                    <th className="sticky top-0 px-4 py-3 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5] text-right">
                      Prix unitaire (DH)
                    </th>
                  </tr>
                </thead>
              <tbody>
                {detailRows.map((row, rowIndex) => {
                  const rowId = getDetailRowId(row, rowIndex);
                  const isSelected = isRowInPanier(row, rowIndex);
                  const panierLine = getPanierLineForRow(row, rowIndex);
                  const prixDisplay =
                    panierLine?.prix_unitaire_ht ??
                    detailPrices[rowId] ??
                    "";
                  const qte =
                    parseFloat(getRowCell(row, ["m3", "quantite"])) || 0;
                  return (
                    <tr
                      key={rowId}
                      className={
                        isSelected ? "bg-[#f9f2e7]" : "hover:bg-[#faf6f1]"
                      }
                    >
                      <td className="px-4 py-3 border-b border-[#f1e9df] text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handleSelectDetailRow(
                              row,
                              rowIndex,
                              e.target.checked
                            )
                          }
                          className="w-5 h-5 accent-[#4B3621]"
                        />
                      </td>
                      <td className="px-4 py-3 border-b border-[#f1e9df] font-medium text-[#3d2c1c]">
                        {buildDesignation(row)}
                      </td>
                      <td className="px-4 py-3 border-b border-[#f1e9df] text-right font-semibold">
                        {qte > 0 ? qte : "—"}
                      </td>
                      <td className="px-4 py-3 border-b border-[#f1e9df] text-right">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Prix…"
                          value={prixDisplay}
                          onChange={(e) =>
                            handleDetailPriceChange(
                              row,
                              rowIndex,
                              e.target.value
                            )
                          }
                          className="w-28 border border-[#e9dfd3] rounded-lg px-2 py-1.5 text-right focus:ring-2 focus:ring-[#4B3621] outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-1">
          <IntelligentSuggestions 
            currentProduct={currentProduct}
            onAddToCart={(product) => {
              // Add to cart logic here
              console.log('Add to cart:', product);
            }}
          />
        </div>
      </div>
      )}

      {!panierLocked && !editingLocked && (
      <div className="mt-10 bg-white rounded-[32px] shadow-sm border border-[#efe8df] p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-[#2d1f13]">
            Informations Client
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Un seul client pour l&apos;ensemble du panier .
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-[#4B3621] mb-2">
              Nom Client
            </label>
            <input
              type="text"
              value={client.nom}
              onChange={(e) =>
                setClient({ ...client, nom: e.target.value })
              }
              placeholder="Nom du client"
              className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#4B3621] mb-2">
              Téléphone
            </label>
            <input
              type="text"
              value={client.telephone}
              onChange={(e) =>
                setClient({ ...client, telephone: e.target.value })
              }
              placeholder="Téléphone"
              className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#4B3621] mb-2">
              Ville
            </label>
            <input
              type="text"
              value={client.ville}
              onChange={(e) =>
                setClient({ ...client, ville: e.target.value })
              }
              placeholder="Ville"
              className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#4B3621] mb-2">
              Email
            </label>
            <input
              type="email"
              value={client.email}
              onChange={(e) =>
                setClient({ ...client, email: e.target.value })
              }
              placeholder="Email"
              className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-bold text-[#4B3621] mb-2">
            Adresse
          </label>
          <textarea
            value={client.adresse}
            onChange={(e) =>
              setClient({ ...client, adresse: e.target.value })
            }
            placeholder="Adresse complète"
            rows={3}
            className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
          />
        </div>

        <div className="mt-6">
          <label className="block text-sm font-bold text-[#4B3621] mb-2">
            Remarque
          </label>
          <textarea
            value={client.remarque}
            onChange={(e) =>
              setClient({ ...client, remarque: e.target.value })
            }
            placeholder="Remarque commerciale..."
            rows={3}
            className="w-full bg-[#f8f5f1] border border-[#e9dfd3] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#4B3621]"
          />
        </div>
      </div>
      )}

      {!panierLocked && !editingLocked && (
      <div className="mt-10 bg-white rounded-[32px] shadow-sm border border-[#efe8df] p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="bg-[#f8f5f1] rounded-3xl p-6 border border-[#e9dfd3] min-w-[300px]">
            <div className="flex justify-between items-center">
              <span className="text-[#4B3621] font-black text-lg">Total commande</span>
              <span className="text-2xl font-black text-[#4B3621]">
                {formatMoney(panierTotals.total)} DH
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              {panier.length} ligne(s) · {panierModelesCount} modèle(s)
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={openBonPreview}
              disabled={submittingBon || panier.length === 0}
              className="bg-gradient-to-r from-[#4B3621] to-[#6d5035] text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              Générer le bon de commande
            </button>
          </div>
          <p className="text-xs text-gray-500 w-full lg:col-span-2">
            Étape 1 : aperçu du bon .
            Étape 2 : valider. 
            Étape 3 : télécharger le PDF.
          </p>
        </div>
      </div>
      )}

      {!panierLocked && !editingLocked && (
      <div className="mt-10 bg-white rounded-[32px] shadow-sm border border-[#efe8df] overflow-hidden">
        <div className="px-8 py-6 border-b border-[#f1e9df] flex items-center justify-between">
          <h2 className="text-2xl font-black text-[#4B3621]">Panier</h2>
          <div className="bg-[#f5ede3] text-[#4B3621] px-5 py-2 rounded-2xl font-black">
            {panier.length} articles
          </div>
        </div>

        {panier.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-semibold">
            Aucun article sélectionné
          </div>
        ) : (
          <div className="overflow-auto max-h-[500px]">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky top-0 px-5 py-4 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5] text-left">
                    Modèle
                  </th>
                  <th className="sticky top-0 px-5 py-4 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5] text-left">
                    Désignation
                  </th>
                  <th className="sticky top-0 px-5 py-4 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5]">
                    Qté (m³)
                  </th>
                  <th className="sticky top-0 px-5 py-4 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5]">
                    Prix unitaire (DH)
                  </th>
                  <th className="sticky top-0 px-5 py-4 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5]">
                    Sous-total
                  </th>
                  <th className="sticky top-0 px-5 py-4 bg-gradient-to-b from-[#faf7f2] to-[#f0e9df] text-[#4B3621] font-black border-b border-[#e8dfd5]">
                    Retirer
                  </th>
                </tr>
              </thead>
              <tbody>
                {panierTotals.lines.map((line) => (
                  <tr key={line.lineId} className="hover:bg-[#faf6f1]">
                    <td className="px-5 py-4 border-b border-[#f1e9df] text-xs font-bold text-[#6d5035] whitespace-nowrap">
                      {line.nom_modele || getModeleNom(line.id_modele)}
                    </td>
                    <td className="px-5 py-4 border-b border-[#f1e9df] font-semibold max-w-xs">
                      {line.designation}
                    </td>
                    <td className="px-5 py-4 border-b border-[#f1e9df]">
                      <input
                        type="number"
                        min="0.0001"
                        step="0.01"
                        value={line.quantite}
                        onChange={(e) =>
                          updatePanierLine(
                            line.lineId,
                            "quantite",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-24 border rounded-lg px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-5 py-4 border-b border-[#f1e9df]">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Prix…"
                        value={
                          line.prix_unitaire_ht === "" ||
                          line.prix_unitaire_ht == null
                            ? ""
                            : line.prix_unitaire_ht
                        }
                        onChange={(e) =>
                          updatePanierLine(
                            line.lineId,
                            "prix_unitaire_ht",
                            e.target.value
                          )
                        }
                        className="w-28 border rounded-lg px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-5 py-4 border-b border-[#f1e9df] font-bold text-right whitespace-nowrap">
                      {formatMoney(line.sous_total_ht)} DH
                    </td>
                    <td className="px-5 py-4 border-b border-[#f1e9df] text-center">
                      <button
                        type="button"
                        onClick={() => removePanierLine(line.lineId)}
                        className="text-red-600 text-sm font-bold hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
      </>
      )}
    </div>
  );
};

export default CommercialView;
