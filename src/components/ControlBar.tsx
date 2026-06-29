import {
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Camera,
} from 'lucide-react';

interface ControlBarProps {
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onScreenshot: () => void;
  currentMove: number;
  totalMoves: number;
  disabled: boolean;
}

export default function ControlBar({
  onFirst,
  onPrev,
  onNext,
  onLast,
  onScreenshot,
  currentMove,
  totalMoves,
  disabled,
}: ControlBarProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-4 bg-stone-800 rounded-xl shadow-lg">
      {/* 开局按钮 */}
      <button
        onClick={onFirst}
        disabled={disabled || currentMove === 0}
        className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-md"
        title="开局"
      >
        <SkipBack size={18} />
        <span className="text-sm font-medium">开局</span>
      </button>

      {/* 退一步按钮 */}
      <button
        onClick={onPrev}
        disabled={disabled || currentMove === 0}
        className="flex items-center justify-center w-12 h-12 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-md"
        title="退一步"
      >
        <ChevronLeft size={24} />
      </button>

      {/* 当前步数显示 */}
      <div className="min-w-[100px] text-center">
        <span className="text-amber-400 font-bold text-lg">
          {currentMove}
        </span>
        <span className="text-stone-400 text-sm"> / {totalMoves}</span>
      </div>

      {/* 前进一步按钮 */}
      <button
        onClick={onNext}
        disabled={disabled || currentMove >= totalMoves}
        className="flex items-center justify-center w-12 h-12 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-md"
        title="前进一步"
      >
        <ChevronRight size={24} />
      </button>

      {/* 终局按钮 */}
      <button
        onClick={onLast}
        disabled={disabled || currentMove >= totalMoves}
        className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-md"
        title="终局"
      >
        <span className="text-sm font-medium">终局</span>
        <SkipForward size={18} />
      </button>

      {/* 分隔线 */}
      <div className="w-px h-8 bg-stone-600 mx-2" />

      {/* 截图按钮 */}
      <button
        onClick={onScreenshot}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-md"
        title="截取棋盘图片"
      >
        <Camera size={18} />
        <span className="text-sm font-medium">截图</span>
      </button>
    </div>
  );
}
