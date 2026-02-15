
import React, { useState, useCallback, useEffect } from 'react';
import { Play, Clipboard, Trash2, ArrowRight, Save, FileText, Undo2, Download } from 'lucide-react';
import { ScriptRow, ProcessedRow, Position, SceneConfig } from './types';
import ScriptTable from './components/ScriptTable';
import ResultTable from './components/ResultTable';
import * as XLSX from 'xlsx';

const INITIAL_ROWS: ScriptRow[] = [
  { id: '1', character: '場面切り替え', dialogue: '', command: 'ずんだもん；右、四国めたん；左' },
  { id: '2', character: '四国めたん', dialogue: 'なんで呼ばれたかわかるわね？', command: 'A連続表示' },
  { id: '3', character: 'ずんだもん', dialogue: 'チャッピーのことなのだ？', command: 'B連続表示' },
  { id: '4', character: '四国めたん', dialogue: 'そう！', command: '' },
  { id: '5', character: '四国めたん', dialogue: 'チャットGPT、略してチャッピーを\nずんだもんが使いすぎている件よ！', command: '' }
];

const App: React.FC = () => {
  const [rows, setRows] = useState<ScriptRow[]>(INITIAL_ROWS);
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Undo用履歴
  const [history, setHistory] = useState<ScriptRow[][]>([]);

  // 履歴保存用関数
  const updateRowsWithHistory = useCallback((newRows: ScriptRow[] | ((prev: ScriptRow[]) => ScriptRow[])) => {
    setRows(prev => {
      const resolvedRows = typeof newRows === 'function' ? newRows(prev) : newRows;
      // 現在の状態を履歴に追加（最大50件）
      setHistory(h => [...h, prev].slice(-50));
      return resolvedRows;
    });
  }, []);

  // Undo実行
  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRows(last);
      return prev.slice(0, -1);
    });
  }, []);

  // ショートカットキー監視 (Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // 入力フォーム内でテキストを編集中の場合は、標準のUndoを優先させる
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const processScript = useCallback(() => {
    setIsProcessing(true);
    
    // 現在の画面内の配置状況
    let currentScene: SceneConfig = { left: '', center: '', right: '' };
    const tierMap = new Map<string, number>(); 
    const trackToCharMap = new Map<string, string>(); 

    const resetAllTiers = () => {
      tierMap.clear();
    };

    const getPositionString = (charName: string): string => {
      if (!charName) return Position.CENTER;
      if (currentScene.left === charName) return Position.LEFT;
      if (currentScene.right === charName) return Position.RIGHT;
      if (currentScene.center === charName) return Position.CENTER;
      return Position.CENTER;
    };

    const results: ProcessedRow[] = rows.map((row, index) => {
      const charInput = row.character.trim();
      const dialogue = row.dialogue.trim();
      const commandInput = row.command?.trim() || '';
      
      const isSceneReset = charInput.includes('場面切り替え') || charInput.includes('画面表示');
      const isClearTrigger = 
        isSceneReset ||
        charInput.includes('全部消して') ||
        charInput.includes('ナレーション') || // ナレーション登場時に段数をリセット
        commandInput.includes('全部消して') ||
        commandInput.includes('画面上のセリフを全て消して');

      if (isClearTrigger) {
        resetAllTiers(); 
        
        if (isSceneReset) {
          currentScene = { left: '', center: '', right: '' };
          const configSource = commandInput || dialogue;
          if (configSource) {
            const pairs = configSource.split(/[,，、\s\n　]+/);
            pairs.forEach(pair => {
              if (!pair) return;
              const match = pair.match(/(.+?)[：:；;](.+)/);
              if (match) {
                const name = match[1].trim();
                const pos = match[2].trim();
                if (pos.includes('右')) currentScene.right = name;
                else if (pos.includes('左')) currentScene.left = name;
                else if (pos.includes('中央') || pos.includes('中')) currentScene.center = name;
              }
            });
          }
          if (!dialogue) {
            return { originalIndex: index, layerName: charInput, dialogue: '', command: commandInput };
          }
        }
      }

      const trackMatch = commandInput.match(/([A-Z])連続表示/);
      if (trackMatch) {
        const symbol = trackMatch[1];
        if (charInput && !isSceneReset && !charInput.includes('連続表示')) {
          trackToCharMap.set(symbol, charInput);
        }
      }

      if (charInput.includes('ナレーション')) {
        return { originalIndex: index, layerName: charInput, dialogue, command: commandInput };
      }

      let charName = charInput;
      if (trackToCharMap.has(charInput)) {
        charName = trackToCharMap.get(charInput)!;
      }
      
      if (!charName && !dialogue) {
        return { originalIndex: index, layerName: '', dialogue: '', command: commandInput };
      }

      const posStr = getPositionString(charName);
      const currentTier = tierMap.get(charName) || 1;
      const layerName = charName ? `${charName}${posStr}${currentTier}` : '';

      if (charName) {
        tierMap.set(charName, currentTier < 3 ? currentTier + 1 : 1);
      }

      return {
        originalIndex: index,
        layerName,
        dialogue,
        command: commandInput
      };
    });

    setProcessedRows(results);
    setTimeout(() => setIsProcessing(false), 300);
  }, [rows]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    const isTableData = text.includes('\t') || (text.trim().split('\n').length > 1);

    if (isTableData) {
      e.preventDefault();
      
      const rowsArr: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          if (inQuotes && text[i + 1] === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === '\t' && !inQuotes) {
          currentRow.push(currentCell);
          currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && text[i + 1] === '\n') i++;
          currentRow.push(currentCell);
          rowsArr.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rowsArr.push(currentRow);
      }

      const newRows: ScriptRow[] = rowsArr
        .filter(r => r.join('').trim() !== '')
        .map(cols => {
          let dialogue = cols[1]?.trim() || '';
          if (dialogue.startsWith('"') && dialogue.endsWith('"')) {
            dialogue = dialogue.substring(1, dialogue.length - 1).replace(/""/g, '"');
          }
          return {
            id: Math.random().toString(36).substr(2, 9),
            character: cols[0]?.trim() || '',
            dialogue: dialogue,
            command: cols[2]?.trim() || ''
          };
        });

      if (newRows.length > 0) {
        updateRowsWithHistory(newRows);
      }
    }
  };

  const clearAll = () => {
    if (confirm('全てのデータをリセットしますか？')) {
      updateRowsWithHistory([]);
      setProcessedRows([]);
    }
  };

  const exportToExcel = () => {
    if (processedRows.length === 0) {
      alert('変換後のデータがありません。');
      return;
    }
    
    // エクスポート用データの作成
    const exportData = processedRows.map(r => ({
      'レイヤー名': r.layerName,
      'セリフ': r.dialogue,
      '指示': r.command
    }));

    // ワークブックとワークシートの作成
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "YMM4_Script");

    // ファイル名の生成
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    
    // ダウンロード実行
    XLSX.writeFile(workbook, `YMM4_Script_${dateStr}_${timeStr}.xlsx`);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-100" onPaste={handlePaste}>
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg">
              <FileText className="text-emerald-700 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">YMM4 連続表示最適化ツール</h1>
              <p className="text-[10px] text-emerald-100 uppercase tracking-tighter">Automatic Tier Management System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={undo} 
              disabled={history.length === 0}
              className="p-2 hover:bg-emerald-800 rounded-md transition-colors text-emerald-100 disabled:opacity-30" 
              title="元に戻す (Ctrl+Z)"
            >
              <Undo2 size={20} />
            </button>
            <button onClick={clearAll} className="p-2 hover:bg-emerald-800 rounded-md transition-colors text-emerald-100" title="全クリア">
              <Trash2 size={20} />
            </button>
            <button 
              onClick={processScript}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-emerald-900 rounded-md shadow-sm transition-all font-bold disabled:opacity-50 active:scale-95 ml-4"
            >
              <Play size={18} fill="currentColor" /> {isProcessing ? '変換中' : '変換実行'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
          <section className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                <Clipboard size={16} /> 入力台本 (スプシからコピペ)
              </h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Overwrite Mode</span>
            </div>
            <div className="flex-grow overflow-auto bg-white p-2">
              <ScriptTable rows={rows} setRows={updateRowsWithHistory} />
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2.5 border-b flex justify-between items-center">
              <h2 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <ArrowRight size={16} /> 変換済み (YMM4用)
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportToExcel}
                  disabled={processedRows.length === 0}
                  className="text-xs flex items-center gap-1.5 bg-emerald-600 border border-emerald-500 px-3 py-1 rounded text-white hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                  title="Excel (.xlsx) として出力"
                >
                  <Download size={14} /> Excel出力
                </button>
                <button 
                  onClick={() => {
                    if (processedRows.length === 0) return;
                    const csv = processedRows.map(r => `${r.layerName}\t${r.dialogue}\t${r.command}`).join('\n');
                    navigator.clipboard.writeText(csv);
                    alert('全てコピーしました！');
                  }}
                  className="text-xs flex items-center gap-1.5 bg-white border border-emerald-200 px-3 py-1 rounded text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm"
                >
                  <Save size={14} /> 全てコピー
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-auto bg-slate-50/30">
              <ResultTable rows={processedRows} />
            </div>
          </section>
        </div>
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none">
        <div className="bg-slate-800 text-white px-4 py-2 rounded-full text-[10px] shadow-2xl opacity-80 backdrop-blur-sm pointer-events-auto border border-slate-700">
          POSITION: キャラ名；位置、キャラ名；位置
        </div>
        <div className="bg-slate-800 text-white px-4 py-2 rounded-full text-[10px] shadow-2xl opacity-80 backdrop-blur-sm pointer-events-auto border border-slate-700">
          PASTE: まとめて貼り付けると全体を上書きします
        </div>
      </div>
    </div>
  );
};

export default App;
