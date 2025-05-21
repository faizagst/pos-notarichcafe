'use client';

import { useEffect, useState } from 'react';

interface PredictionResult {
    ingredientId: number;
    name: string;
    stock: number;
    unit: string;
    type: string;
    avgDailyUsage: number;
    meanDemand: number;
    safetyStock: number;
    targetStockLevel: number;
    daysUntilOutOfStock: number;
    shouldRestock: number;
    restockQty: number;
}

export default function PredictionTable() {
    const [data, setData] = useState<PredictionResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('14');
    const [leadTime, setLeadTime] = useState('3');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const res = await fetch(`/api/predictionStock?period=${period}&leadTime=${leadTime}`);
            const json = await res.json();
            setData(json.data || []);
            setLoading(false);
        };
        fetchData();
    }, [period, leadTime]);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">📊 Prediksi Stok Bahan</h2>

            <div className="flex gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Periode Review (hari)</label>
                    <input
                        type="number"
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="border border-gray-300 px-3 py-1.5 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-24"
                        min={1}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Lead Time (hari)</label>
                    <input
                        type="number"
                        value={leadTime}
                        onChange={e => setLeadTime(e.target.value)}
                        className="border border-gray-300 px-3 py-1.5 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-24"
                        min={0}
                    />
                </div>
            </div>

            {loading ? (
                <p className="text-gray-600">Memuat prediksi...</p>
            ) : (
                <div className="overflow-x-auto border border-gray-300 rounded-md shadow-sm">
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="min-w-full text-sm text-gray-700">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Nama Bahan</th>
                                    <th className="px-4 py-2 text-left font-semibold">Tipe Bahan</th>
                                    <th className="px-4 py-2 text-right font-semibold">Stok Saat ini</th>
                                    <th className="px-4 py-2 text-right font-semibold">Rata-rata Harian</th>
                                    <th className="px-4 py-2 text-right font-semibold">Prediksi</th>
                                    <th className="px-4 py-2 text-right font-semibold">Safety Stock</th>
                                    <th className="px-4 py-2 text-right font-semibold">Total Dibutuhkan</th>
                                    <th className="px-4 py-2 text-right font-semibold">Habis Dalam</th>
                                    <th className="px-4 py-2 text-center font-semibold">Status</th>
                                    <th className="px-4 py-2 text-right font-semibold">Rekomendasi PO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(row => (
                                    <tr
                                        key={row.ingredientId}
                                        className={row.shouldRestock ? 'bg-red-50' : 'hover:bg-gray-50'}
                                    >
                                        <td className="border-t px-4 py-2">{row.name}</td>
                                        <td className="border-t px-4 py-2">{row.type}</td>
                                        <td className="border-t px-4 py-2 text-right">
                                            {row.stock} {row.unit}
                                        </td>
                                        <td className="border-t px-4 py-2 text-right">{row.avgDailyUsage} {row.unit}</td>
                                        <td className="border-t px-4 py-2 text-right">{row.meanDemand} {row.unit}</td>
                                        <td className="border-t px-4 py-2 text-right">{row.safetyStock} {row.unit}</td>
                                        <td className="border-t px-4 py-2 text-right">{row.targetStockLevel} {row.unit}</td>
                                        <td className="border-t px-4 py-2 text-right">
                                            {row.daysUntilOutOfStock === 9999 ? '-' : `${row.daysUntilOutOfStock} hari`}
                                        </td>
                                        <td className="border-t px-4 py-2 text-center">
                                            {row.shouldRestock ? (
                                                <span className="text-red-600 font-semibold">Perlu Restock</span>
                                            ) : (
                                                <span className="text-green-600 font-medium">Stok Aman</span>
                                            )}
                                        </td>
                                        <td className="border-t px-4 py-2 text-right">{row.restockQty} {row.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
