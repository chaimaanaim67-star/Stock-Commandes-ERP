import React, { useEffect, useState } from 'react';
import { getStockData } from '../api/stockService';

const StockTable = () => {
    const [data, setData] = useState({ columns: [], rows: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getStockData()
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-10 text-center font-black text-[#4B3621] uppercase text-xs tracking-widest">Chargement du stock...</div>;

    return (
        <div className="overflow-x-auto rounded-[24px] border border-[#E8E2DC] shadow-sm bg-white">
            <table className="min-w-full border-collapse">
                <thead className="bg-[#4B3621]">
                    <tr>
                        {data.columns.map((col, i) => (
                            <th key={i} className="px-4 py-4 text-[10px] uppercase font-black text-white text-center tracking-widest border-b border-[#3d2c1b]">
                                {col.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                
                {/* HNA L-ISLA7 LI BGHITI */}
                <tbody>
                    {data.rows.map((row, i) => (
                        <tr key={i} className="border-b border-[#F0EBE5] hover:bg-[#F9F7F5] transition-colors">
                            {/* Hit row jaya array b7al [ "SIEGE", "0358", ... ] */}
                            {row.map((val, j) => (
                                <td key={j} className="px-4 py-3 text-[11px] font-bold text-[#4B3621] text-center whitespace-nowrap">
                                    {val !== null && val !== "" ? val : "-"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {data.rows.length === 0 && (
                <div className="p-20 text-center text-gray-400 font-bold uppercase text-[10px]">
                    Aucune donnée disponible dans le stock
                </div>
            )}
        </div>
    );
};

export default StockTable;
