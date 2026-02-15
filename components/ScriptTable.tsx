
import React from 'react';
import { ScriptRow } from '../types';
import { Plus, Trash } from 'lucide-react';

interface ScriptTableProps {
  rows: ScriptRow[];
  setRows: React.Dispatch<React.SetStateAction<ScriptRow[]>>;
}

const ScriptTable: React.FC<ScriptTableProps> = ({ rows, setRows }) => {
  const updateRow = (id: string, field: keyof ScriptRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    const newRow: ScriptRow = {
      id: Math.random().toString(36).substr(2, 9),
      character: '',
      dialogue: '',
      command: ''
    };
    setRows(prev => [...prev, newRow]);
  };

  const insertRowAt = (index: number) => {
    const newRow: ScriptRow = {
      id: Math.random().toString(36).substr(2, 9),
      character: '',
      dialogue: '',
      command: ''
    };
    setRows(prev => {
      const updated = [...prev];
      updated.splice(index, 0, newRow);
      return updated;
    });
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="relative">
      <table className="w-full border-collapse border border-slate-200 text-xs">
        <thead className="sticky top-0 bg-slate-100 z-10">
          <tr>
            <th className="w-8 border border-slate-200 py-1 font-normal text-slate-400">#</th>
            <th className="w-1/4 border border-slate-200 px-2 py-1 text-left font-bold text-slate-600">話者名</th>
            <th className="border border-slate-200 px-2 py-1 text-left font-bold text-slate-600">セリフ</th>
            <th className="w-1/3 border border-slate-200 px-2 py-1 text-left font-bold text-slate-600">表示指示 (コマンド/位置指定)</th>
            <th className="w-16 border border-slate-200">操作</th>
          </tr>
        </thead>
        <tbody>
          {/* Add to Top Button */}
          <tr>
            <td colSpan={5} className="p-0 border border-slate-200 bg-slate-50/50">
              <button
                onClick={() => insertRowAt(0)}
                className="w-full py-1.5 text-[10px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1 transition-all font-bold group"
              >
                <Plus size={12} className="group-hover:scale-110 transition-transform" /> 
                一番上に新しい行を追加
              </button>
            </td>
          </tr>

          {rows.map((row, idx) => (
            <tr key={row.id} className="hover:bg-blue-50/30 group relative">
              <td className="border border-slate-200 text-center text-[10px] text-slate-300 font-mono">{idx + 1}</td>
              <td className="border border-slate-200 p-0">
                <input
                  type="text"
                  value={row.character}
                  onChange={(e) => updateRow(row.id, 'character', e.target.value)}
                  className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-white focus:ring-1 focus:ring-emerald-400 transition-all"
                  placeholder="話者名 / 画面表示"
                />
              </td>
              <td className="border border-slate-200 p-0">
                <textarea
                  value={row.dialogue}
                  rows={1}
                  onChange={(e) => {
                    updateRow(row.id, 'dialogue', e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-white focus:ring-1 focus:ring-emerald-400 transition-all resize-none overflow-hidden block"
                  placeholder="セリフ内容"
                />
              </td>
              <td className="border border-slate-200 p-0">
                <input
                  type="text"
                  value={row.command}
                  onChange={(e) => updateRow(row.id, 'command', e.target.value)}
                  className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-white focus:ring-1 focus:ring-emerald-400 transition-all"
                  placeholder="指示 / 位置指定"
                />
              </td>
              <td className="border border-slate-200 p-0 text-center">
                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <button 
                    onClick={() => removeRow(row.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="削除"
                  >
                    <Trash size={12} />
                  </button>
                  <button 
                    onClick={() => insertRowAt(idx + 1)}
                    className="text-slate-300 hover:text-emerald-500 transition-colors"
                    title="下に挿入"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          
          {/* Add to Bottom Button (only if rows exist, to avoid double buttons when empty) */}
          {rows.length > 0 && (
            <tr>
              <td colSpan={5} className="p-2 border border-slate-200">
                <button
                  onClick={addRow}
                  className="w-full py-2 border-2 border-dashed border-slate-100 rounded-lg text-slate-300 hover:border-emerald-200 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all text-[10px] font-bold"
                >
                  + 最後に新しい行を追加
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ScriptTable;
