import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from '@/pages/Home';
import ChessLibrary from '@/pages/ChessLibrary';
import CrawlerTool from '@/pages/CrawlerTool';
import { FileText, Library, Terminal, Gamepad2 } from 'lucide-react';
import type { ChessGame } from '@/utils/chessParser';

export default function App() {
  const location = useLocation();
  const [currentGame, setCurrentGame] = useState<ChessGame | null>(null);

  const handleGameLoaded = (game: ChessGame) => {
    setCurrentGame(game);
  };

  return (
    <div className="min-h-screen bg-stone-900">
      {location.pathname === '/' && currentGame && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-stone-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-stone-700">
            <h2 className="text-lg font-bold text-amber-400 mb-4">已加载棋谱</h2>
            <p className="text-stone-300 mb-2">{currentGame.title}</p>
            <p className="text-stone-400 text-sm mb-6">红方: {currentGame.red} vs 黑方: {currentGame.black}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentGame(null)}
                className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors text-sm"
              >
                返回首页
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('chessGameLoaded', { detail: currentGame }));
                }}
                className="flex-1 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm"
              >
                查看棋谱
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-stone-900/90 backdrop-blur-sm border-b border-stone-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-700 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-amber-100" />
                </div>
                <span className="text-amber-400 font-bold" style={{ fontFamily: 'KaiTi, STKaiti, SimKai, serif' }}>
                  象棋棋谱工具
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <NavLink to="/" icon={<FileText size={18} />} label="解析棋谱" />
                <NavLink to="/library" icon={<Library size={18} />} label="棋谱库" />
                <NavLink to="/crawler" icon={<Terminal size={18} />} label="爬虫工具" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home game={currentGame} onGameLoaded={handleGameLoaded} />} />
        <Route path="/library" element={<ChessLibrary onGameLoaded={handleGameLoaded} />} />
        <Route path="/crawler" element={<CrawlerTool />} />
      </Routes>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-amber-700/20 text-amber-400'
          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
