import { useRef, useEffect } from 'react';
import type { ChessMove } from '@/utils/chessParser';
import type { BrilliantMove } from '@/utils/brilliantMoveAnalyzer';
import { getBrilliantMoveTypeName } from '@/utils/brilliantMoveAnalyzer';
import { Sparkles } from 'lucide-react';

interface MoveListProps {
  moves: ChessMove[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
  brilliantMoves?: BrilliantMove[];
  onBrilliantMoveClick?: (moveIndex: number) => void;
}

export default function MoveList({
  moves,
  currentMoveIndex,
  onMoveClick,
  brilliantMoves,
  onBrilliantMoveClick,
}: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRowRef.current && scrollRef.current) {
      const row = activeRowRef.current;
      const container = scrollRef.current;
      
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const rowTop = row.offsetTop;
      const rowBottom = rowTop + row.clientHeight;
      
      if (rowTop < containerTop) {
        container.scrollTop = rowTop - 10;
      } else if (rowBottom > containerBottom) {
        container.scrollTop = rowBottom - container.clientHeight + 10;
      }
    }
  }, [currentMoveIndex]);

  if (moves.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500">
        <p>暂无棋谱数据</p>
      </div>
    );
  }

  const pairs: { idx: number; red?: ChessMove; black?: ChessMove }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      idx: Math.floor(i / 2) + 1,
      red: moves[i],
      black: moves[i + 1],
    });
  }

  const getActiveRowRef = (pairIdx: number) => {
    if (currentMoveIndex === (pairIdx - 1) * 2 || currentMoveIndex === (pairIdx - 1) * 2 + 1) {
      return activeRowRef;
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-stone-800/60 rounded-xl border border-stone-700 overflow-hidden">
      <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
        <h3 className="text-amber-400 font-bold text-sm">棋谱记录</h3>
      </div>
      
      {/* 神之一手展示 */}
      {brilliantMoves && brilliantMoves.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-amber-900/40 to-amber-800/20 border-b border-amber-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-amber-400 font-bold text-sm">精彩着法 ({brilliantMoves.length})</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {brilliantMoves.map((bm, index) => (
              <div
                key={bm.moveIndex}
                className="p-2 bg-stone-800/50 rounded-lg border border-stone-700/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-stone-300">
                    第{bm.round}回合 · {bm.notation}
                  </div>
                  <div className="text-xs text-amber-400/70">
                    {getBrilliantMoveTypeName(bm.type)}
                  </div>
                </div>
                <div className="text-xs text-amber-300/80 mb-2">
                  {bm.reason}
                </div>
                <button
                  onClick={() => onBrilliantMoveClick?.(bm.moveIndex)}
                  className="w-full px-3 py-1 bg-amber-700/50 hover:bg-amber-700 text-amber-100 rounded text-xs transition-colors"
                >
                  跳转查看
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="text-xs text-stone-400 grid grid-cols-[40px_1fr_1fr] gap-1 px-2 py-2 border-b border-stone-700/50">
          <div className="text-center">回合</div>
          <div className="text-red-400/70 text-center">红方</div>
          <div className="text-stone-400/70 text-center">黑方</div>
        </div>
        {pairs.map((pair) => (
          <div
            key={pair.idx}
            ref={getActiveRowRef(pair.idx)}
            className="grid grid-cols-[40px_1fr_1fr] gap-1 px-2 py-1.5 border-b border-stone-700/30 text-sm"
          >
            <div className="text-stone-500 text-center flex items-center justify-center">
              {pair.idx}
            </div>
            <div
              className={`cursor-pointer rounded px-1 py-0.5 text-center transition-colors ${
                currentMoveIndex === (pair.idx - 1) * 2
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-red-400 hover:bg-stone-700/50'
              }`}
              onClick={() => onMoveClick((pair.idx - 1) * 2)}
            >
              {pair.red?.notation || '-'}
            </div>
            <div
              className={`cursor-pointer rounded px-1 py-0.5 text-center transition-colors ${
                currentMoveIndex === (pair.idx - 1) * 2 + 1
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-stone-300 hover:bg-stone-700/50'
              }`}
              onClick={() => pair.black && onMoveClick((pair.idx - 1) * 2 + 1)}
            >
              {pair.black?.notation || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
