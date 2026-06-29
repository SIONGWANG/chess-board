import type { ChessMove } from '@/utils/chessParser';

interface MoveListProps {
  moves: ChessMove[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

export default function MoveList({
  moves,
  currentMoveIndex,
  onMoveClick,
}: MoveListProps) {
  if (moves.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500">
        <p>暂无棋谱数据</p>
      </div>
    );
  }

  // 将步数分组：红黑为一组
  const pairs: { idx: number; red?: ChessMove; black?: ChessMove }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      idx: Math.floor(i / 2) + 1,
      red: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <div className="h-full flex flex-col bg-stone-800/60 rounded-xl border border-stone-700 overflow-hidden">
      <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
        <h3 className="text-amber-400 font-bold text-sm">棋谱记录</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="text-xs text-stone-400 grid grid-cols-[40px_1fr_1fr] gap-1 px-2 py-2 border-b border-stone-700/50">
          <div className="text-center">回合</div>
          <div className="text-red-400/70 text-center">红方</div>
          <div className="text-stone-400/70 text-center">黑方</div>
        </div>
        {pairs.map((pair) => (
          <div
            key={pair.idx}
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
