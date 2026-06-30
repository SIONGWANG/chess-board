import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileJson, FileText, AlertCircle } from 'lucide-react';
import { parseXQFText, parseDpxqJson, type ChessGame, type DpxqChessItem } from '@/utils/chessParser';

interface ChessFileUploadProps {
  onGameLoaded: (game: ChessGame) => void;
}

export default function ChessFileUpload({ onGameLoaded }: ChessFileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(Array.from(files));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    setError('');
    setSuccess('');

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (!['json', 'xqf'].includes(ext || '')) {
        setError(`不支持的文件格式: ${file.name}，仅支持 .json 和 .xqf`);
        continue;
      }

      try {
        const text = await file.text();
        
        let game: ChessGame | null = null;
        
        if (ext === 'xqf') {
          const result = parseXQFText(text);
          if (result.success && result.game) {
            game = result.game;
          } else {
            setError(`XQF解析失败: ${result.error || '未知错误'}`);
            continue;
          }
        } else if (ext === 'json') {
          const jsonData = JSON.parse(text);
          
          if (Array.isArray(jsonData)) {
            if (jsonData.length > 0 && jsonData[0].moves) {
              const result = parseDpxqJson(jsonData[0] as DpxqChessItem);
              if (result.success && result.game) {
                game = result.game;
              } else {
                setError(`JSON解析失败: ${result.error || '未知错误'}`);
                continue;
              }
            } else {
              setError('JSON文件格式不正确，缺少 moves 字段');
              continue;
            }
          } else if (jsonData.moves) {
            const result = parseDpxqJson(jsonData as DpxqChessItem);
            if (result.success && result.game) {
              game = result.game;
            } else {
              setError(`JSON解析失败: ${result.error || '未知错误'}`);
              continue;
            }
          } else {
            setError('JSON文件格式不正确');
            continue;
          }
        }

        if (game) {
          saveToLocalCache(game);
          onGameLoaded(game);
          setSuccess(`✓ 成功加载棋谱: ${game.title}`);
          setTimeout(() => setIsOpen(false), 1500);
        }

      } catch (err) {
        setError(`读取文件失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const saveToLocalCache = (game: ChessGame) => {
    const cacheKey = `chess_local_cache_${Date.now()}`;
    const cache: Record<string, ChessGame> = JSON.parse(
      localStorage.getItem('chess_local_cache') || '{}'
    );
    cache[cacheKey] = game;
    localStorage.setItem('chess_local_cache', JSON.stringify(cache));
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setError(''); setSuccess(''); }}
        className="flex items-center gap-2 px-5 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
      >
        <Upload size={18} />
        <span className="text-sm font-medium">上传棋谱文件</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.xqf"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-700">
            <div className="px-6 py-4 border-b border-stone-700 flex items-center justify-between bg-stone-800/50">
              <h2 className="text-lg font-bold text-amber-400">上传棋谱文件</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="m-6 border-2 border-dashed border-stone-600 rounded-xl p-8 text-center hover:border-amber-500 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={handleButtonClick}
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-stone-700/50 rounded-xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-stone-300 font-medium mb-2">拖拽文件到此处或点击选择</p>
              <p className="text-stone-500 text-sm">支持 .json（爬虫产出格式）和 .xqf（标准棋谱格式）</p>
              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2 text-stone-400 text-sm">
                  <FileJson size={16} />
                  <span>.json</span>
                </div>
                <div className="flex items-center gap-2 text-stone-400 text-sm">
                  <FileText size={16} />
                  <span>.xqf</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-6 mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mx-6 mb-4 p-3 bg-green-900/30 border border-green-700/50 rounded-lg flex items-center gap-3">
                <span className="text-green-400 font-medium">{success}</span>
              </div>
            )}

            <div className="px-6 py-4 border-t border-stone-700 flex justify-end gap-3 bg-stone-800/30">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}