import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Star, Trash2, Download, Table2, Clock } from 'lucide-react';
import { parseDpxqJson, type ChessGame, type DpxqChessItem } from '@/utils/chessParser';

export interface ChessIndexItem {
  id: string;
  year: number;
  event: string;
  redPlayer: string;
  blackPlayer: string;
  title: string;
  result: string;
}

interface ChessLibraryProps {
  onGameLoaded: (game: ChessGame) => void;
}

export default function ChessLibrary({ onGameLoaded }: ChessLibraryProps) {
  const [indexData, setIndexData] = useState<ChessIndexItem[]>([]);
  const [filteredData, setFilteredData] = useState<ChessIndexItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    loadFavorites();
    loadIndex();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchText, selectedYear]);

  const loadFavorites = () => {
    const stored = localStorage.getItem('chess_favorite');
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  };

  const loadIndex = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/chess_data/full_index.json');
      
      if (!response.ok) {
        throw new Error('棋谱索引文件不存在');
      }
      
      const data = await response.json();
      setIndexData(data);
      setFilteredData(data);
      
    } catch (err) {
      console.warn('加载棋谱索引失败:', err);
      setError('未找到棋谱索引文件，请先运行爬虫生成数据');
      setIndexData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...indexData];
    
    if (selectedYear !== 'all') {
      filtered = filtered.filter(item => item.year === parseInt(selectedYear, 10));
    }
    
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(item =>
        item.redPlayer.toLowerCase().includes(query) ||
        item.blackPlayer.toLowerCase().includes(query) ||
        item.event.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query)
      );
    }
    
    setFilteredData(filtered);
  };

  const handleRowDoubleClick = async (item: ChessIndexItem) => {
    try {
      const yearData = await fetch(`/chess_data/raw/${item.year}.json`);
      const yearGames = await yearData.json();
      const gameData = yearGames.find((g: DpxqChessItem) => g.id === item.id);
      
      if (gameData) {
        const result = parseDpxqJson(gameData);
        if (result.success && result.game) {
          onGameLoaded(result.game);
        } else {
          alert(`解析失败: ${result.error}`);
        }
      } else {
        alert('未找到棋谱详情数据');
      }
    } catch (err) {
      alert(`加载棋谱失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const toggleFavorite = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    
    const newFavorites = favorites.includes(itemId)
      ? favorites.filter(id => id !== itemId)
      : [...favorites, itemId];
    
    setFavorites(newFavorites);
    localStorage.setItem('chess_favorite', JSON.stringify(newFavorites));
  };

  const toggleSelectRow = (itemId: string) => {
    const newSelected = selectedRows.includes(itemId)
      ? selectedRows.filter(id => id !== itemId)
      : [...selectedRows, itemId];
    
    setSelectedRows(newSelected);
  };

  const clearCache = () => {
    if (confirm('确定要清除所有本地缓存的棋谱吗？')) {
      localStorage.removeItem('chess_local_cache');
      localStorage.removeItem('chess_favorite');
      setFavorites([]);
      alert('缓存已清除');
    }
  };

  const exportSelected = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的棋谱');
      return;
    }
    
    const selectedItems = filteredData.filter(item => selectedRows.includes(item.id));
    const content = JSON.stringify(selectedItems, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = [...new Set(indexData.map(item => item.year))].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900">
      <header className="bg-stone-900/80 backdrop-blur-sm border-b border-stone-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-700 rounded-lg flex items-center justify-center">
              <Table2 className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-400">棋谱库</h1>
              <p className="text-sm text-stone-400 mt-0.5">共 {filteredData.length} 局棋谱</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearCache}
              className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors text-sm"
            >
              <Trash2 size={16} />
              <span>清除缓存</span>
            </button>
            <button
              onClick={exportSelected}
              disabled={selectedRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              <Download size={16} />
              <span>导出 ({selectedRows.length})</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 bg-stone-800 rounded-2xl flex items-center justify-center border border-stone-700">
              <Clock className="w-8 h-8 text-stone-600" />
            </div>
            <p className="text-stone-400 text-lg mb-2">{error}</p>
            <p className="text-stone-500 text-sm">请运行 npm run crawl 生成棋谱数据</p>
          </div>
        ) : (
          <>
            <div className="bg-stone-800/60 rounded-xl p-4 border border-stone-700 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="搜索棋手名称或赛事..."
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-300 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-stone-400" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">全部年份</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-stone-800/60 rounded-xl border border-stone-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-800 border-b border-stone-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(filteredData.map(item => item.id));
                            } else {
                              setSelectedRows([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-stone-600 bg-stone-700 text-amber-500 focus:ring-amber-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">年份</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">红方</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">黑方</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">赛事</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">结果</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-400 uppercase tracking-wider w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-700/50">
                    {filteredData.map((item) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer hover:bg-stone-700/50 transition-colors ${
                          selectedRows.includes(item.id) ? 'bg-stone-700/30' : ''
                        }`}
                        onDoubleClick={() => handleRowDoubleClick(item)}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.id)}
                            onChange={() => toggleSelectRow(item.id)}
                            className="w-4 h-4 rounded border-stone-600 bg-stone-700 text-amber-500 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-stone-500 text-sm font-mono">{item.year}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-red-400 text-sm font-medium">{item.redPlayer}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-stone-300 text-sm font-medium">{item.blackPlayer}</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate">
                          <span className="text-stone-400 text-sm">{item.event}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            item.result.includes('红胜') ? 'text-red-400' :
                            item.result.includes('黑胜') ? 'text-stone-300' :
                            'text-amber-400'
                          }`}>
                            {item.result || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => toggleFavorite(e, item.id)}
                            className={`p-1.5 rounded transition-colors ${
                              favorites.includes(item.id)
                                ? 'text-amber-500 bg-amber-500/20'
                                : 'text-stone-500 hover:text-amber-400 hover:bg-stone-700'
                            }`}
                            title={favorites.includes(item.id) ? '取消收藏' : '收藏'}
                          >
                            <Star size={16} className={favorites.includes(item.id) ? 'fill-current' : ''} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredData.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-stone-500">没有找到匹配的棋谱</p>
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-stone-600 text-xs">
              ⚠️ 本工具仅用于个人学习研究，禁止商用爬取网站付费VIP棋谱
            </p>
          </>
        )}
      </main>
    </div>
  );
}