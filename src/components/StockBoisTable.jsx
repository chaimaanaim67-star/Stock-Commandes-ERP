import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StockBoisTable = ({ idModele }) => {
    const [pivot, setPivot] = useState(null);

    useEffect(() => {
        axios.get(`http://localhost:5000/api/modele/dynamic-stock/${idModele}`)
            .then(res => setPivot(res.data))
            .catch(err => console.error(err));
    }, [idModele]);

    if (!pivot) return <p>Chargement en cours...</p>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-800 text-white text-center font-bold uppercase tracking-widest">
                    Stock Bois Exotique (Ismawood)
                </div>
                
                <table className="w-full border-collapse text-xs text-gray-700">
                    <thead className="bg-gray-200 border-b-2 border-gray-400">
                        <tr>
                            {/* L-Headers dyal l-Lignes */}
                            {pivot.headers.rowLabels.map((lbl, i) => (
                                <th key={i} className="border border-gray-400 p-2 uppercase font-black text-blue-900">{lbl}</th>
                            ))}
                            {/* L-Headers dyal l-Colonnes (Fournisseurs) */}
                            {pivot.headers.colLabels.map((col, i) => (
                                <th key={i} className="border border-gray-400 p-2 rotate-0 min-w-[80px] bg-blue-50">
                                    {col.replace('|', ' ')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(pivot.data).map(([rowKey, cols], rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-blue-100 border-b border-gray-300">
                                {rowKey.split('|').map((val, idx) => (
                                    <td key={idx} className="border border-gray-300 p-1 font-semibold">{val}</td>
                                ))}
                                {pivot.headers.colLabels.map((col, idx) => (
                                    <td key={idx} className={`border border-gray-300 p-1 text-center ${col === 'Total' ? 'bg-yellow-50 font-bold' : ''}`}>
                                        {cols[col] ? cols[col].toFixed(3) : '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockBoisTable;
