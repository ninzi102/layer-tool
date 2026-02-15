
import React from 'react';
import { ProcessedRow } from '../types';
import { Layers, AlertCircle } from 'lucide-react';

interface ResultTableProps {
  rows: ProcessedRow[];
}

const ResultTable: React.FC<ResultTableProps> = ({ rows }) => {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 p-10">
        <Layers className="w-10 h-10 opacity-20" />
        <p className="text-xs font-bold tracking-widest opacity-50">NO DATA PROCESSED</p>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse border border-emerald-100 text-xs table-fixed">
      <thead className="sticky top-0 bg-emerald-50 z-10">
        <tr>
          <th className="w-8 border border-emerald-100 py-1 font-normal text-emerald-300">#</th>
          <th className="w-1/4 border border-emerald-100 px-2 py-1 text-left font-bold text-emerald-800">レイヤー名</th>
          <th className="border border-emerald-100 px-2 py-1 text-left font-bold text-emerald-800">セリフ</th>
          <th className="w-1/4 border border-emerald-100 px-2 py-1 text-left font-bold text-emerald-800">指示</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const isCmd = 
            row.layerName.includes('全部消して') || 
            row.layerName.includes('場面切り替え') || 
            row.layerName.includes('画面表示') ||
            row.layerName.includes('ナレーション');
          const isWarning = row.layerName === '';
          
          return (
            <tr key={idx} className={`${isCmd ? 'bg-amber-50' : 'hover:bg-emerald-50/30'}`}>
              <td className="border border-emerald-50 text-center text-[10px] text-emerald-200 font-mono">{idx + 1}</td>
              <td className={`border border-emerald-50 px-2 py-2 font-bold break-all ${isCmd ? 'text-amber-600 italic' : 'text-emerald-600'}`}>
                {row.layerName}
              </td>
              <td className="border border-emerald-50 px-2 py-2 text-slate-700 whitespace-pre-wrap leading-relaxed select-all">
                {row.dialogue}
              </td>
              <td className="border border-emerald-50 px-2 py-2 text-slate-400 text-[10px]">
                {row.command}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ResultTable;
