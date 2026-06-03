import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axiosConfig';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  normalizePivotPosition,
  uiZoneToDbPosition,
  normalizePivotKeyPart,
} from '../utils/pivotZones';

import {
  Search,
  Download,
  Plus,
  Pencil,
  Trash2,
  Camera
} from 'lucide-react';

import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

import SmartStockEntry from '../components/stock/SmartStockEntry';

/** Valeurs cochées en premier, puis le reste ; conserve les valeurs sauvegardées même absentes du stock filtré. */
const sortValuesWithSelectedFirst = (options, selected = []) => {
  const opt = [...(options || [])];
  const sel = [...(selected || [])];
  sel.forEach((s) => {
    if (!opt.some((o) => String(o) === String(s))) opt.push(s);
  });
  const selIndex = (v) => {
    const i = sel.findIndex((s) => String(s) === String(v));
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...opt].sort((a, b) => {
    const ia = selIndex(a);
    const ib = selIndex(b);
    if (ia !== ib) return ia - ib;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
};

/** Trouve le nom exact de colonne stock (casse / alias). */
const resolveStockColumn = (name, columns = []) => {
  if (!name) return null;
  const cols = columns || [];
  if (cols.includes(name)) return name;
  const lower = String(name).trim().toLowerCase();
  const found = cols.find((c) => String(c).trim().toLowerCase() === lower);
  return found || String(name).trim();
};

const StockView = () => {

  // =====================================================
  // STATES
  // =====================================================

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');

  const [stockData, setStockData] = useState({
    columns: [],
    rows: []
  });

  const [filterValues, setFilterValues] = useState({});
  const [filterSearch, setFilterSearch] = useState({});
  const [pivotRowValues, setPivotRowValues] = useState({});
  const [pivotColValues, setPivotColValues] = useState({});
  const [pivotRowSearch, setPivotRowSearch] = useState({});
  const [pivotColSearch, setPivotColSearch] = useState({});
const [modeles, setModeles] = useState([]);
const [selectedModele, setSelectedModele] = useState(null);
const [modeleDetails, setModeleDetails] = useState([]);
const [modeleModalOpen, setModeleModalOpen] = useState(false);
const [modeleModalMode, setModeleModalMode] = useState('add'); // 'add' | 'edit'
const [modeleForm, setModeleForm] = useState({ nom_modele: '', unite: 'm³' });
const [modeleSaving, setModeleSaving] = useState(false);
const [configSaving, setConfigSaving] = useState(false);
const [showSmartStockEntry, setShowSmartStockEntry] = useState(false);
const pendingModelPayload = useRef(null);

  const normalizePosition = (position) => normalizePivotPosition(position);

  const buildDetailsFromZones = (id_modele) => {
    const details = [];
    const seen = new Set();

    const pushField = (variante, uiZone) => {
      if (!variante) return;
      const key = `${uiZone}\0${variante}`;
      if (seen.has(key)) return;
      seen.add(key);
      details.push({
        id_modele,
        ordre: details.length + 1,
        position: uiZoneToDbPosition(uiZone),
        variante,
      });
    };

    const pushZone = (fields, uiZone) => {
      (fields || []).forEach((variante) => pushField(variante, uiZone));
    };

    pushZone(zones.filters, 'filters');
    pushZone(zones.rows, 'rows');
    pushZone(zones.columns, 'columns');
    pushZone(zones.values, 'values');

    // Champs cochés dans les sélections mais pas encore dans une zone (évite p_modele vide)
    const selectionZones = [
      ['filters', filterValues],
      ['rows', pivotRowValues],
      ['columns', pivotColValues],
    ];
    selectionZones.forEach(([uiZone, byField]) => {
      Object.keys(byField || {}).forEach((variante) => pushField(variante, uiZone));
    });

    return details;
  };

  const mergeDetailsWithSelections = (details, selections, id_modele) => {
    const merged = [...(details || [])];
    const hasField = (uiZone, variante) =>
      merged.some(
        (d) =>
          normalizePosition(d.position) === uiZone &&
          String(d.variante) === String(variante)
      );

    let ordre = merged.reduce(
      (max, d) => Math.max(max, Number(d.ordre || 0)),
      0
    );

    const selectionZones = [
      ['filters', selections?.filters],
      ['rows', selections?.rows],
      ['columns', selections?.columns],
    ];

    selectionZones.forEach(([uiZone, byField]) => {
      Object.keys(byField || {}).forEach((variante) => {
        if (!hasField(uiZone, variante)) {
          ordre += 1;
          merged.push({
            id_modele,
            variante,
            position: uiZoneToDbPosition(uiZone),
            ordre,
          });
        }
      });
    });

    return merged.sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
  };

  const applyModelConfig = (id_modele, payload) => {
    const rawDetails = (
      Array.isArray(payload) ? payload : payload?.details || []
    ).sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));

    const selections = Array.isArray(payload)
      ? emptySelections()
      : payload?.selections || emptySelections();

    const details = mergeDetailsWithSelections(
      rawDetails,
      selections,
      id_modele
    );

    setModeleDetails(details);
    applyDetailsToZones(details);
    applySelectionsFromModel(selections);
  };

  const applyDetailsToZones = (details) => {
    const filters = [];
    const rows = [];
    const columns = [];
    const values = [];

    const sorted = [...(details || [])].sort(
      (a, b) => Number(a.ordre || 0) - Number(b.ordre || 0)
    );

    const cols =
      stockData.columns?.length > 0
        ? stockData.columns
        : sorted.map((d) => d.variante).filter(Boolean);

    sorted.forEach((item) => {
      const variante = resolveStockColumn(item.variante, cols);
      if (!variante) return;

      switch (normalizePosition(item.position)) {
        case 'filters':
          if (!filters.includes(variante)) filters.push(variante);
          break;
        case 'rows':
          if (!rows.includes(variante)) rows.push(variante);
          break;
        case 'columns':
          if (!columns.includes(variante)) columns.push(variante);
          break;
        case 'values':
          if (!values.includes(variante)) values.push(variante);
          break;
        default:
          break;
      }
    });

    const usedFields = [...filters, ...rows, ...columns, ...values];
    const allColumns =
      stockData.columns?.length > 0
        ? [...stockData.columns]
        : [...usedFields];
    const remainingFields = allColumns.filter(
      (field) => !usedFields.includes(field)
    );

    setZones({
      fields: remainingFields,
      filters,
      rows,
      columns,
      values
    });
  };

  const resetZonesLayout = () => {
    setZones({
      fields: [...stockData.columns],
      filters: [],
      rows: [],
      columns: [],
      values: []
    });
    setFilterValues({});
    setFilterSearch({});
    setPivotRowValues({});
    setPivotColValues({});
    setPivotRowSearch({});
    setPivotColSearch({});
  };

  const emptySelections = () => ({
    filters: {},
    rows: {},
    columns: {}
  });

  const buildSelectionsPayload = () => ({
    filters: filterValues,
    rows: pivotRowValues,
    columns: pivotColValues
  });

  const applySelectionsFromModel = (selections) => {
    const sel = selections || emptySelections();
    setFilterValues(sel.filters || {});
    setPivotRowValues(sel.rows || {});
    setPivotColValues(sel.columns || {});
    setFilterSearch({});
    setPivotRowSearch({});
    setPivotColSearch({});
  };

  const matchesFieldSelection = (parts, fields, selectionByField) =>
    fields.every((field, index) => {
      const selected = selectionByField[field];
      if (!Array.isArray(selected) || selected.length === 0) return true;
      return selected.some((value) => String(value) === String(parts[index]));
    });

  const buildFieldOptions = (fields, dataRows) => {
    const result = {};
    fields.forEach((field) => {
      const fieldIndex = stockData.columns.indexOf(field);
      if (fieldIndex === -1) return;
      result[field] = [
        ...new Set(dataRows.map((row) => row[fieldIndex]))
      ];
    });
    return result;
  };

  const toggleFieldValue = (setter, field, value, checked) => {
    setter((prev) => {
      const current = prev[field] || [];
      if (checked) {
        if (current.some((v) => String(v) === String(value))) return prev;
        return { ...prev, [field]: [...current, value] };
      }
      return {
        ...prev,
        [field]: current.filter((v) => String(v) !== String(value))
      };
    });
  };

  const renderValueSelectionPanel = (
    title,
    fields,
    optionsByField,
    valuesByField,
    setValuesByField,
    searchByField,
    setSearchByField
  ) => {
    if (!fields.length) return null;

    return (
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-lg text-[#4B3621] mb-4">{title}</h2>
        <div className="flex flex-wrap gap-6">
          {fields.map((field) => (
            <div key={field} className="flex flex-col gap-3 min-w-60">
              <label className="font-bold text-sm">{field}</label>
              <div className="border rounded-xl p-3 max-h-[250px] overflow-auto bg-gray-50">
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 mb-3 sticky top-0">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Recherche..."
                    value={searchByField[field] || ''}
                    onChange={(e) =>
                      setSearchByField((prev) => ({
                        ...prev,
                        [field]: e.target.value
                      }))
                    }
                    className="bg-transparent outline-none text-sm w-full"
                  />
                </div>
                {sortValuesWithSelectedFirst(
                  optionsByField[field] || [],
                  valuesByField[field] || []
                )
                  .filter((value) =>
                    String(value || '')
                      .toLowerCase()
                      .includes((searchByField[field] || '').toLowerCase())
                  )
                  .map((value, index) => {
                    const selected = valuesByField[field] || [];
                    const isChecked = selected.some(
                      (v) => String(v) === String(value)
                    );
                    return (
                      <label
                        key={`${field}-${index}-${String(value)}`}
                        className="flex items-center gap-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            toggleFieldValue(
                              setValuesByField,
                              field,
                              value,
                              e.target.checked
                            )
                          }
                        />
                        <span className="text-sm">{String(value)}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // =====================================================
  // ZONES
  // =====================================================

  const [zones, setZones] = useState({
    fields: [],
    filters: [],
    rows: [],
    columns: [],
    values: []
  });

  // =====================================================
  // FETCH COLUMNS
  // =====================================================

  useEffect(() => {

    const fetchColumns = async () => {

      try {

        const res = await api.get('/api/stock/colonnes');
        const cols = res.data.columns || [];

        setZones((prev) => {
          const hasPivot =
            prev.filters.length > 0 ||
            prev.rows.length > 0 ||
            prev.columns.length > 0 ||
            prev.values.length > 0;

          if (hasPivot) {
            const used = [
              ...prev.filters,
              ...prev.rows,
              ...prev.columns,
              ...prev.values,
            ];
            return {
              ...prev,
              fields: cols.filter((f) => !used.includes(f)),
            };
          }

          return {
            fields: cols,
            filters: [],
            rows: [],
            columns: [],
            values: [],
          };
        });

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);

      }

    };

    fetchColumns();

  }, []);

  // =====================================================
  // FETCH DATA
  // =====================================================

  useEffect(() => {

    api
      .get('/api/stock')
      .then((res) => {
        setStockData({
          columns: res.data?.columns || [],
          rows: res.data?.rows || [],
        });
      })
      .catch((err) => {
        console.error(err);
        setStockData({ columns: [], rows: [] });
      });
  }, []);
// =====================================================
// FETCH MODELES
// =====================================================

const fetchModeles = async () => {
  try {
    const res = await api.get('/api/modeles/all');
    setModeles(res.data || []);
  } catch (err) {
    console.error(err);
  }
};

useEffect(() => {
  fetchModeles();
}, []);

  useEffect(() => {
    const pending = pendingModelPayload.current;
    if (!pending || stockData.columns.length === 0) return;
    applyModelConfig(pending.id_modele, pending.payload);
    pendingModelPayload.current = null;
  }, [stockData.columns.length]);

  useEffect(() => {
    if (
      !selectedModele ||
      modeleDetails.length === 0 ||
      stockData.columns.length === 0
    ) {
      return;
    }
    applyDetailsToZones(modeleDetails);
  }, [stockData.columns.length, selectedModele, modeleDetails]);

  // =====================================================
  // FILTER OPTIONS
  // =====================================================

  const filterOptions = useMemo(
    () => buildFieldOptions(zones.filters, stockData.rows || []),
    [zones.filters, stockData.rows, stockData.columns]
  );

  // =====================================================
  // FILTER DATA
  // =====================================================

  const filteredData = useMemo(() => {

    let data = [...(stockData.rows || [])];

    // FILTERS

    zones.filters.forEach((field) => {

      const selectedValues =
        Array.isArray(filterValues[field])
          ? filterValues[field]
          : [];

      if (selectedValues.length === 0) {
        return;
      }

      const fieldIndex =
        stockData.columns.indexOf(field);

      data = data.filter((row) => {

        const cellValue = row[fieldIndex];

        return selectedValues.some(
          (value) =>
            String(value) === String(cellValue)
        );

      });

    });

    // SEARCH

    if (searchTerm) {

      data = data.filter((row) => {

        return row.some((cell) =>
          String(cell || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        );

      });

    }

    return data;

  }, [
    stockData,
    searchTerm,
    zones.filters,
    filterValues
  ]);

  const pivotRowOptions = useMemo(
    () => buildFieldOptions(zones.rows, stockData.rows || []),
    [zones.rows, stockData.rows, stockData.columns]
  );

  const pivotColOptions = useMemo(
    () => buildFieldOptions(zones.columns, stockData.rows || []),
    [zones.columns, stockData.rows, stockData.columns]
  );

  // =====================================================
  // FILTERED FIELDS
  // =====================================================

  const filteredFields = useMemo(() => {

    return zones.fields.filter((field) =>
      field
        .toLowerCase()
        .includes(fieldSearch.toLowerCase())
    );

  }, [zones.fields, fieldSearch]);

  // =====================================================
  // DRAG DROP
  // =====================================================

  const onDragEnd = (result) => {

    const { source, destination } = result;

    if (!destination) return;

    const sourceZone = source.droppableId;
    const destinationZone = destination.droppableId;

    if (
      sourceZone === destinationZone &&
      source.index === destination.index
    ) {
      return;
    }

    setZones((prev) => {

      const newState = {
        fields: [...prev.fields],
        filters: [...prev.filters],
        rows: [...prev.rows],
        columns: [...prev.columns],
        values: [...prev.values]
      };

      const sourceItems =
        sourceZone === "fields"
          ? filteredFields
          : newState[sourceZone];

      const movedItem =
        sourceItems[source.index];

      // REMOVE FROM ORIGINAL ARRAY

      newState[sourceZone] =
        newState[sourceZone].filter(
          item => item !== movedItem
        );

      // INSERT

      newState[destinationZone].splice(
        destination.index,
        0,
        movedItem
      );

      return newState;

    });

  };
 // =====================================================
// SELECT MODELE
// =====================================================

const loadModeleConfig = async (id_modele) => {
  setSelectedModele(id_modele);

  try {
    const res = await api.get(`/api/p_modele/config/${id_modele}`);
    const payload = res.data;

    if (stockData.columns.length === 0) {
      pendingModelPayload.current = { id_modele, payload };
      setModeleDetails(
        (Array.isArray(payload) ? payload : payload?.details || []).sort(
          (a, b) => Number(a.ordre || 0) - Number(b.ordre || 0)
        )
      );
      return;
    }

    pendingModelPayload.current = null;
    applyModelConfig(id_modele, payload);
  } catch (err) {
    console.error(err);
    alert('Impossible de charger la configuration du modèle.');
  }
};

const handleSelectModele = (id_modele) => {
  loadModeleConfig(id_modele);
};

const saveModeleConfig = async (id_modele, { silent = false } = {}) => {
  if (id_modele == null) return;

  setConfigSaving(true);
  try {
    const details = buildDetailsFromZones(id_modele);
    const selections = buildSelectionsPayload();
    await api.put(`/api/p_modele/config/${id_modele}`, { details, selections });
    setModeleDetails(details);

    if (!silent) {
      alert(
        'Configuration enregistrée.\n' +
          'Zones : Filtres, Lignes, Colonnes et surtout Valeurs (ex. m3) pour le tableau.'
      );
    }
  } catch (err) {
    console.error(err);
    const message =
      err.response?.data?.message ||
      'Erreur lors de la sauvegarde de la configuration.';
    if (!silent) {
      alert(message);
    }
    throw err;
  } finally {
    setConfigSaving(false);
  }
};
  // =====================================================
  // PIVOT TABLE
  // =====================================================

const openAddModele = () => {
  setModeleModalMode('add');
  setModeleForm({ nom_modele: '', unite: 'm³' });
  setModeleModalOpen(true);
};

const openEditModele = () => {
  if (selectedModele == null) return;
  const m = modeles.find((x) => Number(x.id_modele) === Number(selectedModele));
  if (!m) return;
  setModeleModalMode('edit');
  setModeleForm({
    nom_modele: m.nom_modele || '',
    unite: m.unite || 'm³'
  });
  setModeleModalOpen(true);
};

const saveModele = async (e) => {
  e.preventDefault();
  setModeleSaving(true);
  try {
    const payload = {
      nom_modele: modeleForm.nom_modele.trim(),
      unite: (modeleForm.unite || 'm³').trim()
    };

    let id_modele = selectedModele;

    if (modeleModalMode === 'add') {
      const createRes = await api.post('/api/modeles', payload);
      id_modele = createRes.data?.id_modele;
      setSelectedModele(id_modele);
    } else {
      await api.put(`/api/modeles/${selectedModele}`, payload);
    }

    if (id_modele != null) {
      await saveModeleConfig(id_modele, { silent: true });
    }

    setModeleModalOpen(false);
    await fetchModeles();
    if (id_modele != null) {
      await loadModeleConfig(id_modele);
    }
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || "Erreur lors de l'enregistrement du modèle.");
  } finally {
    setModeleSaving(false);
  }
};

const deleteSelectedModele = async () => {
  if (selectedModele == null) return;
  if (!window.confirm('Supprimer ce modèle ? Cette action est définitive.')) return;
  try {
    await api.delete(`/api/modeles/${selectedModele}`);
    setSelectedModele(null);
    setModeleDetails([]);
    pendingModelPayload.current = null;
    resetZonesLayout();
    await fetchModeles();
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || 'Erreur lors de la suppression.');
  }
};
const hasValueField = zones.values.length > 0;
  const stockCols = stockData.columns || [];

  const columnIndexInStock = (field) => {
    const resolved = resolveStockColumn(field, stockCols);
    const i = stockCols.indexOf(resolved);
    return i;
  };

  const pivotTable = useMemo(() => {

    if (
      zones.rows.length === 0 ||
      zones.columns.length === 0 ||
      stockCols.length === 0
    ) {
      return {};
    }

    const rowIndexes = zones.rows.map((field) => columnIndexInStock(field));

    const columnIndexes = zones.columns.map((field) => columnIndexInStock(field));

    const valueField = resolveStockColumn(zones.values[0], stockCols);

    const valueIndex = stockCols.indexOf(valueField);

    const result = {};

    filteredData.forEach((row) => {

      const rowValues = rowIndexes.map((index) =>
        index >= 0 ? normalizePivotKeyPart(row[index]) : '-'
      );
      const columnValues = columnIndexes.map((index) =>
        index >= 0 ? normalizePivotKeyPart(row[index]) : '-'
      );

      const rowKey =
        rowValues.join(" | ");

      const columnKey =
        columnValues.join(" | ");

      if (!result[rowKey]) {
        result[rowKey] = {};
      }

      if (!result[rowKey][columnKey]) {
        result[rowKey][columnKey] = 0;
      }

      if (valueIndex !== -1) {

        result[rowKey][columnKey] +=
          parseFloat(row[valueIndex]) || 0;

      } else {

        result[rowKey][columnKey] += 1;

      }

    });

    return result;

  }, [zones, stockData, filteredData, stockCols]);

  // =====================================================
  // UNIQUE COLUMNS
  // =====================================================

  const uniqueColumns = useMemo(() => {

    const cols = new Set();

    Object.values(pivotTable).forEach((rowObj) => {

      Object.keys(rowObj).forEach((col) => {
        cols.add(col);
      });

    });

    return Array.from(cols);

  }, [pivotTable]);

// =====================================================
// SORT PIVOT ROWS
// =====================================================

const sortedPivotEntries = useMemo(() => {

  return Object.entries(pivotTable).sort(
    ([a], [b]) => {

      const aParts = a.split(' | ');
      const bParts = b.split(' | ');

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {

        const av = String(aParts[i] || '');
        const bv = String(bParts[i] || '');

        const compare = av.localeCompare(
          bv,
          undefined,
          {
            numeric: true,
            sensitivity: 'base'
          }
        );

        if (compare !== 0) {
          return compare;
        }

      }

      return 0;

    }
  );

}, [pivotTable]);

// =====================================================
// VISIBLE COLUMNS
// =====================================================

const visibleColumns = useMemo(() => {

  return [...uniqueColumns]
    .sort((a, b) => {

      const aParts = a.split(' | ');
      const bParts = b.split(' | ');

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {

        const av = String(aParts[i] || '');
        const bv = String(bParts[i] || '');

        const compare = av.localeCompare(
          bv,
          undefined,
          {
            numeric: true,
            sensitivity: 'base'
          }
        );

        if (compare !== 0) {
          return compare;
        }

      }

      return 0;

    })
    .filter((colKey) => {

      const parts = colKey.split(' | ');

      return matchesFieldSelection(
        parts,
        zones.columns,
        pivotColValues
      );

    });

}, [
  uniqueColumns,
  zones.columns,
  pivotColValues
]);

// =====================================================
// VISIBLE PIVOT ENTRIES
// =====================================================

const visiblePivotEntries = useMemo(() => {

  return sortedPivotEntries.filter(([rowKey, rowData]) => {

    const parts = rowKey.split(' | ');

    // FILTER SELECTED VALUES
    const matches = matchesFieldSelection(
      parts,
      zones.rows,
      pivotRowValues
    );

    if (!matches) return false;

    if (visibleColumns.length === 0) return true;

    return visibleColumns.some(
      (col) => Number(rowData[col] || 0) !== 0
    );

  });

}, [
  sortedPivotEntries,
  zones.rows,
  pivotRowValues,
  visibleColumns
]);
// =====================================================
// TOTALS
// =====================================================

const columnTotals = useMemo(() => {

  const totals = {};

  visibleColumns.forEach((col) => {

    totals[col] = visiblePivotEntries.reduce(
      (sum, [, rowData]) =>
        sum + Number(rowData[col] || 0),
      0
    );

  });

  return totals;

}, [visibleColumns, visiblePivotEntries]);

const grandTotal = useMemo(() => {

  return Object.values(columnTotals).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

}, [columnTotals]);

  // =====================================================
  // EXPORT EXCEL
  // =====================================================
const handleExportExcel = () => {

  const rows = [];

  // =====================================
  // HEADER MULTI LEVEL
  // =====================================

  for (let levelIndex = 0; levelIndex < zones.columns.length; levelIndex++) {

    const headerRow = [];

    // ROW HEADERS

    if (levelIndex === 0) {

      zones.rows.forEach((rowField) => {
        headerRow.push(rowField);
      });

    } else {

      zones.rows.forEach(() => {
        headerRow.push("");
      });

    }

    // COLUMN HEADERS

    visibleColumns.forEach((col) => {

      const parts = col.split(" | ");

      headerRow.push(parts[levelIndex] || "");

    });

    // TOTAL HEADER

    headerRow.push(
      levelIndex === 0
        ? "TOTAL"
        : ""
    );

    rows.push(headerRow);

  }

  // =====================================
  // BODY
  // =====================================

  visiblePivotEntries.forEach(([rowName, rowData]) => {

    const rowParts = rowName.split(" | ");

    const excelRow = [...rowParts];

    let rowTotal = 0;

    visibleColumns.forEach((col) => {

      const value =
        Number(rowData[col] || 0);

      excelRow.push(value);

      rowTotal += value;

    });

    excelRow.push(rowTotal);

    rows.push(excelRow);

  });

  // =====================================
  // TOTAL ROW
  // =====================================

  const totalRow = [];

  zones.rows.forEach((_, index) => {

    totalRow.push(
      index === 0
        ? "TOTAL"
        : ""
    );

  });

  let grandTotal = 0;

  visibleColumns.forEach((col) => {

    const total =
      visiblePivotEntries.reduce(
        (sum, [, rowData]) =>
          sum + Number(rowData[col] || 0),
        0
      );

    totalRow.push(total);

    grandTotal += total;

  });

  totalRow.push(grandTotal);

  rows.push(totalRow);

  // =====================================
  // SHEET
  // =====================================

  const worksheet =
    XLSX.utils.aoa_to_sheet(rows);

  // =====================================
  // MERGES
  // =====================================

  worksheet["!merges"] = [];

  // ROW MERGES

  zones.rows.forEach((_, colIndex) => {

    let startRow = zones.columns.length;

    while (startRow < rows.length - 1) {

      let endRow = startRow;

      while (
        endRow + 1 < rows.length - 1
      ) {

        let sameHierarchy = true;

        for (
          let i = 0;
          i <= colIndex;
          i++
        ) {

          if (
            rows[startRow][i] !==
            rows[endRow + 1][i]
          ) {

            sameHierarchy = false;
            break;

          }

        }

        if (!sameHierarchy) break;

        endRow++;

      }

      if (endRow > startRow) {

        worksheet["!merges"].push({

          s: {
            r: startRow,
            c: colIndex
          },

          e: {
            r: endRow,
            c: colIndex
          }

        });

      }

      startRow = endRow + 1;

    }

  });

  // COLUMN HEADER MERGES

  zones.columns.forEach((_, levelIndex) => {

    let startCol = zones.rows.length;

    while (
      startCol <
      zones.rows.length + visibleColumns.length
    ) {

      let endCol = startCol;

      while (
        endCol + 1 <
        zones.rows.length + visibleColumns.length
      ) {

        const current =
          rows[levelIndex][startCol];

        const next =
          rows[levelIndex][endCol + 1];

        if (
          current &&
          current === next
        ) {

          endCol++;

        } else {

          break;

        }

      }

      if (endCol > startCol) {

        worksheet["!merges"].push({

          s: {
            r: levelIndex,
            c: startCol
          },

          e: {
            r: levelIndex,
            c: endCol
          }

        });

      }

      startCol = endCol + 1;

    }

  });

  // =====================================
  // COLUMN WIDTH
  // =====================================

  worksheet["!cols"] =
    rows[0].map(() => ({
      wch: 18
    }));

  // =====================================
  // STYLES
  // =====================================

  const range =
    XLSX.utils.decode_range(
      worksheet["!ref"]
    );

  for (
    let R = 0;
    R <= range.e.r;
    ++R
  ) {

    for (
      let C = 0;
      C <= range.e.c;
      ++C
    ) {

      const cellAddress =
        XLSX.utils.encode_cell({
          r: R,
          c: C
        });

      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = {

        font: {
          bold:
            R < zones.columns.length ||
            C < zones.rows.length ||
            R === rows.length - 1
        },

        alignment: {
          horizontal: "center",
          vertical: "center"
        },

        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" }
        }

      };

    }

  }

  // =====================================
  // WORKBOOK
  // =====================================

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "PivotTable"
  );

  const excelBuffer =
    XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true
    });

  const data = new Blob(
    [excelBuffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  );

  saveAs(
    data,
    "PivotTable.xlsx"
  );

};

  // =====================================================
  // REUSABLE ZONE
  // =====================================================

  const renderZone = (
    droppableId,
    title,
    bgColor
  ) => (

    <Droppable droppableId={droppableId}>

      {(provided) => (

        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="
            bg-white
            border
            rounded-2xl
            p-4
            min-h-45
            shadow-sm
          "
        >

          <h3 className="font-bold mb-4 text-gray-700">
            {title}
          </h3>

          {zones[droppableId].map((field, index) => (

            <Draggable
              key={field}
              draggableId={field}
              index={index}
            >

              {(provided) => (

                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`
                    p-3
                    mb-2
                    rounded-xl
                    cursor-grab
                    text-sm
                    font-medium
                    transition-all
                    hover:scale-[1.02]
                    ${bgColor}
                  `}
                >
                  {field}
                </div>

              )}

            </Draggable>

          ))}

          {provided.placeholder}

        </div>

      )}

    </Droppable>
  );

  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="p-5 bg-gray-50 min-h-screen space-y-6">

   {/* ===================================================== */}
{/* MODELES */}
{/* ===================================================== */}

<div
  className="
    bg-white
    border
    rounded-2xl
    p-5
    shadow-sm
  "
>

  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

    <h2 className="font-bold text-xl text-[#4B3621]">
      Modèles
    </h2>

    <div className="flex flex-wrap gap-3 ">

      {modeles.map((modele) => (

        <button
          key={modele.id_modele}
          onClick={() =>
            handleSelectModele(modele.id_modele)
          }
          className={`
            px-5
            py-2
            rounded-xl
            border
            transition-all
            font-semibold
            text-sm

            ${
              selectedModele === modele.id_modele
                ? `
                  bg-[#4B3621]
                  text-white
                  border-[#4B3621]
                `
                : `
                  bg-white
                  hover:bg-[#9DC183]/20
                `
            }
          `}
        >

          {modele.nom_modele}

        </button>

      ))}

    </div>

    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={openAddModele}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#9DC183] text-[#4B3621] text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Plus size={18} />
        Créer
      </button>
      <button
        type="button"
        onClick={() => setShowSmartStockEntry(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#4B3621] to-[#6d5035] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Camera size={18} />
        Scanner Réception Stock
      </button>
      <button
        type="button"
        onClick={openEditModele}
        disabled={selectedModele == null}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E2DC] bg-white text-sm font-semibold text-[#4B3621] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9F7F5]"
      >
        <Pencil size={18} />
        Modifier
      </button>
      <button
        type="button"
        onClick={() => saveModeleConfig(selectedModele)}
        disabled={selectedModele == null || configSaving}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4B3621] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#3d2c1b]"
      >
        {configSaving ? 'Enregistrement…' : 'Enregistrer config'}
      </button>
      <button
        type="button"
        onClick={deleteSelectedModele}
        disabled={selectedModele == null}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-100"
      >
        <Trash2 size={18} />
        Supprimer
      </button>
    </div>

  </div>

  {/* LISTE MODELES */}

  {/* <div className="flex flex-wrap gap-3 mb-5">

    {modeles.map((modele) => (

      <button
        key={modele.id_modele}
        onClick={() =>
          handleSelectModele(modele.id_modele)
        }
        className={`
          px-5
          py-2
          rounded-xl
          border
          transition-all
          font-semibold
          text-sm

          ${
            Number(selectedModele) === Number(modele.id_modele)
              ? `
                bg-[#4B3621]
                text-white
                border-[#4B3621]
              `
              : `
                bg-white
                hover:bg-[#9DC183]/20
              `
          }
        `}
      >

        {modele.nom_modele || `Modèle #${modele.id_modele}`}

      </button>

    ))}

  </div> */}

  {/* {selectedModele != null && modeleDetails.length > 0 && (
    <p className="text-sm text-gray-600">
      Configuration chargée (zones et valeurs cochées). Modifiez puis cliquez sur{' '}
      <strong>Enregistrer config</strong>.
    </p>
  )} */}

  {modeleModalOpen && (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modele-modal-title"
    >
      <div className="bg-white rounded-2xl border border-[#E8E2DC] shadow-xl max-w-md w-full p-6">
        <h3 id="modele-modal-title" className="font-bold text-lg text-[#4B3621] mb-4">
          {modeleModalMode === 'add' ? 'Nouveau modèle' : 'Modifier le modèle'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Après création, cliquez sur le modèle pour rouvrir votre tableau. Utilisez « Enregistrer config » pour sauvegarder zones et sélections.
        </p>
        <form onSubmit={saveModele} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
              Nom du modèle
            </label>
            <input
              type="text"
              className="w-full border border-[#E8E2DC] rounded-lg p-3 text-sm font-semibold text-[#4B3621] outline-none focus:ring-2 focus:ring-[#9DC183]"
              value={modeleForm.nom_modele}
              onChange={(e) => setModeleForm({ ...modeleForm, nom_modele: e.target.value })}
              placeholder="Ex: Chêne massif"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
              Unité
            </label>
            <input
              type="text"
              className="w-full border border-[#E8E2DC] rounded-lg p-3 text-sm font-semibold text-[#4B3621] outline-none focus:ring-2 focus:ring-[#9DC183]"
              value={modeleForm.unite}
              onChange={(e) => setModeleForm({ ...modeleForm, unite: e.target.value })}
              placeholder="m³"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModeleModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E8E2DC] text-sm font-semibold text-[#4B3621] hover:bg-[#F9F7F5]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={modeleSaving}
              className="px-4 py-2 rounded-lg bg-[#4B3621] text-white text-sm font-semibold hover:bg-[#3d2c1b] disabled:opacity-50"
            >
              {modeleSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

</div>

      {/* DRAG DROP */}

      <DragDropContext onDragEnd={onDragEnd}>

        <div className="flex gap-6 items-start">

          {/* CHAMPS */}

          <Droppable droppableId="fields">

            {(provided) => (

              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="
                  w-72
                  bg-white
                  border
                  rounded-2xl
                  p-4
                  shadow-sm
                  sticky
                  top-4
                "
              >

                {/* HEADER */}

                <div className="mb-4">

                  <h2 className="font-bold text-lg text-[#4B3621] mb-3">
                    Champs
                  </h2>

                  {/* SEARCH */}

                  <div className="
                    flex
                    items-center
                    gap-2
                    bg-gray-100
                    rounded-xl
                    px-3
                    py-2
                  ">

                    <Search
                      size={16}
                      className="text-gray-500"
                    />

                    <input
                      type="text"
                      placeholder="Rechercher un champ..."
                      value={fieldSearch}
                      onChange={(e) =>
                        setFieldSearch(e.target.value)
                      }
                      className="
                        bg-transparent
                        outline-none
                        w-full
                        text-sm
                      "
                    />

                  </div>

                </div>

                {/* SCROLL */}

                <div className="
                  max-h-[600px]
                  overflow-y-auto
                  pr-2
                ">

                  {filteredFields.map((field, index) => (

                    <Draggable
                      key={field}
                      draggableId={field}
                      index={index}
                    >

                      {(provided) => (

                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="
                            p-3
                            mb-2
                            bg-gray-100
                            hover:bg-[#9DC183]/20
                            rounded-xl
                            cursor-grab
                            text-sm
                            transition-all
                          "
                        >
                          {field}
                        </div>

                      )}

                    </Draggable>

                  ))}

                  {provided.placeholder}

                </div>

              </div>

            )}

          </Droppable>

          {/* RIGHT SIDE */}

          <div className="
            flex-1
            grid
            grid-cols-2
            gap-4
          ">

            {renderZone(
              "filters",
              "Filtres",
              "bg-yellow-100"
            )}

            {renderZone(
              "columns",
              "Colonnes",
              "bg-blue-100"
            )}

            {renderZone(
              "rows",
              "Lignes",
              "bg-green-100"
            )}

            {renderZone(
              "values",
              "Valeurs",
              "bg-red-100"
            )}

          </div>

        </div>

      </DragDropContext>



      {renderValueSelectionPanel(
        'Valeurs — Filtres',
        zones.filters,
        filterOptions,
        filterValues,
        setFilterValues,
        filterSearch,
        setFilterSearch
      )}

      {renderValueSelectionPanel(
        'Valeurs — Lignes',
        zones.rows,
        pivotRowOptions,
        pivotRowValues,
        setPivotRowValues,
        pivotRowSearch,
        setPivotRowSearch
      )}

      {renderValueSelectionPanel(
        'Valeurs — Colonnes',
        zones.columns,
        pivotColOptions,
        pivotColValues,
        setPivotColValues,
        pivotColSearch,
        setPivotColSearch
      )}
<div className="flex justify-end mb-4">

  <button
    onClick={handleExportExcel}
    className="
      bg-[#9DC183]
      hover:bg-[#89ad70]
      text-white
      px-5
      py-3
      rounded-xl
      flex
      items-center
      gap-2
      transition-all
      font-semibold
    "
  >
    <Download size={18} />
    Export Excel
  </button>

</div>
    {/* TABLE */}

{!hasValueField ? (

  <div
    className="
      bg-white
      border
      rounded-2xl
      p-10
      shadow-sm
      text-center
    "
  >

    <div className="text-5xl mb-4">
      ⚠️
    </div>

    <h2 className="text-xl font-bold text-[#4B3621] mb-2">
      Aucun champ dans “Valeurs”
    </h2>

    <p className="text-gray-500 text-sm">
      Glissez un champ dans la zone
      <span className="font-bold text-[#4B3621]"> Valeurs </span>
      pour afficher le tableau croisé.
    </p>

  </div>

) : (

  <div className="
    bg-white
    rounded-2xl
    border
    overflow-auto
    shadow-sm
  ">

        <table className="min-w-full border-collapse">
<thead>

  {zones.columns.map((_, levelIndex) => (

    <tr
      key={levelIndex}
      className="bg-gray-100"
    >

      {/* ROW HEADERS */}

      {levelIndex === 0 &&
        zones.rows.map((rowField, index) => (

          <th
            key={index}
            rowSpan={zones.columns.length}
            className="
              border
              p-3
              text-left
              bg-gray-100
            "
          >
            {rowField}
          </th>

        ))}

      {/* COLUMN HEADERS */}

      {visibleColumns.map((col, colIndex) => {

        const parts = col.split(" | ");

        const currentValue =
          parts[levelIndex] || "";

        // CHECK PREVIOUS
        let shouldRender = true;

        if (colIndex > 0) {

          const previousParts =
            visibleColumns[colIndex - 1]
              .split(" | ");

          shouldRender = false;

          for (
            let i = 0;
            i <= levelIndex;
            i++
          ) {

            if (
              previousParts[i] !== parts[i]
            ) {

              shouldRender = true;
              break;

            }

          }

        }

        if (!shouldRender) {
          return null;
        }

        // CALCULATE COLSPAN

        let colSpan = 1;

        for (
          let nextIndex = colIndex + 1;
          nextIndex < visibleColumns.length;
          nextIndex++
        ) {

          const nextParts =
            visibleColumns[nextIndex]
              .split(" | ");

          let sameHierarchy = true;

          for (
            let j = 0;
            j <= levelIndex;
            j++
          ) {

            if (
              nextParts[j] !== parts[j]
            ) {

              sameHierarchy = false;
              break;

            }

          }

          if (sameHierarchy) {

            colSpan++;

          } else {

            break;

          }

        }

        return (

          <th
            key={colIndex}
            colSpan={colSpan}
            className="
              border
              p-3
              text-center
              bg-gray-100
            "
          >

            {currentValue}

          </th>

        );

      })}

    </tr>

  ))}

</thead>

      <tbody>

  {visiblePivotEntries.map(
    ([rowName, rowData], rowIndex, allRows) => {

      const rowParts = rowName.split(" | ");

      // =====================================
      // ROW TOTAL
      // =====================================

      const rowTotal = visibleColumns.reduce(
        (sum, col) =>
          sum + Number(rowData[col] || 0),
        0
      );

      return (

        <tr key={rowIndex}>

          {/* ROW LEVELS */}

          {rowParts.map((cell, cellIndex) => {

            let shouldRender = true;

            if (rowIndex > 0) {

              const previousParts =
                allRows[rowIndex - 1][0].split(" | ");

              shouldRender = false;

              for (let i = 0; i <= cellIndex; i++) {

                if (previousParts[i] !== rowParts[i]) {
                  shouldRender = true;
                  break;
                }

              }

            }

            if (!shouldRender) {
              return null;
            }

            let rowSpan = 1;

            for (
              let nextIndex = rowIndex + 1;
              nextIndex < allRows.length;
              nextIndex++
            ) {

              const nextParts =
                allRows[nextIndex][0].split(" | ");

              let sameHierarchy = true;

              for (let j = 0; j <= cellIndex; j++) {

                if (nextParts[j] !== rowParts[j]) {
                  sameHierarchy = false;
                  break;
                }

              }

              if (sameHierarchy) {
                rowSpan++;
              } else {
                break;
              }

            }

            return (

              <td
                key={cellIndex}
                rowSpan={rowSpan}
                className="
                  border
                  p-3
                  bg-gray-50
                  font-semibold
                  align-top
                "
              >
                {cell}
              </td>

            );

          })}

          {/* VALUES */}

          {visibleColumns.map((col, colIndex) => (

            <td
              key={colIndex}
              className="border p-3 text-center"
            >
              {Number(
                rowData[col] || 0
              ).toFixed(2)}
            </td>

          ))}

          {/* ROW TOTAL */}

          <td
            className="
              border
              p-3
              text-center
              font-bold
              bg-yellow-100
            "
          >
            {rowTotal.toFixed(2)}
          </td>

        </tr>

      );

    }
  )}

  {/* COLUMN TOTALS */}

  <tr className="bg-gray-200 font-bold">

    {zones.rows.map((_, index) => (

      <td
        key={index}
        className="border p-3"
      >
        {index === 0 ? 'TOTAL' : ''}
      </td>

    ))}

    {visibleColumns.map((col, index) => (

      <td
        key={index}
        className="border p-3 text-center"
      >
        {columnTotals[col].toFixed(2)}
      </td>

    ))}

    {/* GRAND TOTAL */}

    <td className="border p-3 text-center bg-yellow-300">
      {grandTotal.toFixed(2)}
    </td>

  </tr>

</tbody>

               </table>

      </div>

    )}

    {showSmartStockEntry && (
      <SmartStockEntry
        onClose={() => setShowSmartStockEntry(false)}
        onStockUpdate={() => {
          setShowSmartStockEntry(false);
          // Refresh stock data
          fetchStock();
        }}
      />
    )}
    </div>
  );
};

export default StockView;