import { forwardRef } from 'react';

interface ChessBoardProps {
  board: (string | null)[][];
  lastMove?: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
}

// 棋子中文名称
const PIECE_NAMES_RED: Record<string, string> = {
  k: '帅',
  r: '车',
  n: '马',
  b: '相',
  a: '仕',
  c: '炮',
  p: '兵',
};

const PIECE_NAMES_BLACK: Record<string, string> = {
  k: '将',
  r: '车',
  n: '馬',
  b: '象',
  a: '士',
  c: '砲',
  p: '卒',
};

// 红方列数（从右往左：一~九，col=0是九路，col=8是一路）
const RED_COLS = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];

// 黑方列数（从左往右：1~9，col=0是1路，col=8是9路）
const BLACK_COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const ChessBoard = forwardRef<HTMLDivElement, ChessBoardProps>(
  ({ board, lastMove }, ref) => {
    const CELL_SIZE = 56;
    const PADDING = 24;
    const EDGE_SIZE = 40; // 上下边缘数字区域
    const SIDE_EDGE = 36; // 左右边缘，给数字和棋子留足够空间
    const BOARD_WIDTH = CELL_SIZE * 8 + SIDE_EDGE * 2;
    const BOARD_HEIGHT = CELL_SIZE * 9 + EDGE_SIZE * 2;
    const PIECE_RADIUS = CELL_SIZE * 0.42;

    // 渲染网格线
    const renderGrid = () => {
      const elements = [];
      const boardLeft = SIDE_EDGE;
      const boardTop = EDGE_SIZE;

      // 10条横线
      for (let i = 0; i < 10; i++) {
        const y = boardTop + i * CELL_SIZE;
        elements.push(
          <line
            key={`h-${i}`}
            x1={boardLeft}
            y1={y}
            x2={boardLeft + 8 * CELL_SIZE}
            y2={y}
            stroke="#5C2E18"
            strokeWidth="1.5"
          />
        );
      }

      // 9条竖线（中间楚河汉界断开）
      for (let j = 0; j < 9; j++) {
        const x = boardLeft + j * CELL_SIZE;
        if (j === 0 || j === 8) {
          elements.push(
            <line
              key={`v-${j}`}
              x1={x}
              y1={boardTop}
              x2={x}
              y2={boardTop + 9 * CELL_SIZE}
              stroke="#5C2E18"
              strokeWidth="1.5"
            />
          );
        } else {
          elements.push(
            <line
              key={`v-${j}-top`}
              x1={x}
              y1={boardTop}
              x2={x}
              y2={boardTop + 4 * CELL_SIZE}
              stroke="#5C2E18"
              strokeWidth="1.5"
            />,
            <line
              key={`v-${j}-bottom`}
              x1={x}
              y1={boardTop + 5 * CELL_SIZE}
              x2={x}
              y2={boardTop + 9 * CELL_SIZE}
              stroke="#5C2E18"
              strokeWidth="1.5"
            />
          );
        }
      }

      // 九宫格斜线 - 上方（黑方）
      elements.push(
        <line key="palace-tl" x1={boardLeft + 3 * CELL_SIZE} y1={boardTop} x2={boardLeft + 5 * CELL_SIZE} y2={boardTop + 2 * CELL_SIZE} stroke="#5C2E18" strokeWidth="1.5" />,
        <line key="palace-tr" x1={boardLeft + 5 * CELL_SIZE} y1={boardTop} x2={boardLeft + 3 * CELL_SIZE} y2={boardTop + 2 * CELL_SIZE} stroke="#5C2E18" strokeWidth="1.5" />
      );
      // 九宫格斜线 - 下方（红方）
      elements.push(
        <line key="palace-bl" x1={boardLeft + 3 * CELL_SIZE} y1={boardTop + 7 * CELL_SIZE} x2={boardLeft + 5 * CELL_SIZE} y2={boardTop + 9 * CELL_SIZE} stroke="#5C2E18" strokeWidth="1.5" />,
        <line key="palace-br" x1={boardLeft + 5 * CELL_SIZE} y1={boardTop + 7 * CELL_SIZE} x2={boardLeft + 3 * CELL_SIZE} y2={boardTop + 9 * CELL_SIZE} stroke="#5C2E18" strokeWidth="1.5" />
      );

      // 炮和兵卒的定位标记
      const markPositions = [
        // 炮位
        { row: 2, col: 1 }, { row: 2, col: 7 },
        { row: 7, col: 1 }, { row: 7, col: 7 },
        // 兵卒位
        { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 4 }, { row: 3, col: 6 }, { row: 3, col: 8 },
        { row: 6, col: 0 }, { row: 6, col: 2 }, { row: 6, col: 4 }, { row: 6, col: 6 }, { row: 6, col: 8 },
      ];

      markPositions.forEach((pos, idx) => {
        const cx = boardLeft + pos.col * CELL_SIZE;
        const cy = boardTop + pos.row * CELL_SIZE;
        const size = 5;
        const gap = 4;

        const isLeft = pos.col === 0;
        const isRight = pos.col === 8;

        if (!isLeft) {
          elements.push(
            <line key={`mark-l-${idx}`} x1={cx - gap - size} y1={cy - gap} x2={cx - gap} y2={cy - gap} stroke="#5C2E18" strokeWidth="1.5" />,
            <line key={`mark-l2-${idx}`} x1={cx - gap} y1={cy - gap - size} x2={cx - gap} y2={cy - gap} stroke="#5C2E18" strokeWidth="1.5" />
          );
          elements.push(
            <line key={`mark-lb-${idx}`} x1={cx - gap - size} y1={cy + gap} x2={cx - gap} y2={cy + gap} stroke="#5C2E18" strokeWidth="1.5" />,
            <line key={`mark-lb2-${idx}`} x1={cx - gap} y1={cy + gap} x2={cx - gap} y2={cy + gap + size} stroke="#5C2E18" strokeWidth="1.5" />
          );
        }
        if (!isRight) {
          elements.push(
            <line key={`mark-r-${idx}`} x1={cx + gap} y1={cy - gap} x2={cx + gap + size} y2={cy - gap} stroke="#5C2E18" strokeWidth="1.5" />,
            <line key={`mark-r2-${idx}`} x1={cx + gap} y1={cy - gap - size} x2={cx + gap} y2={cy - gap} stroke="#5C2E18" strokeWidth="1.5" />
          );
          elements.push(
            <line key={`mark-rb-${idx}`} x1={cx + gap} y1={cy + gap} x2={cx + gap + size} y2={cy + gap} stroke="#5C2E18" strokeWidth="1.5" />,
            <line key={`mark-rb2-${idx}`} x1={cx + gap} y1={cy + gap} x2={cx + gap} y2={cy + gap + size} stroke="#5C2E18" strokeWidth="1.5" />
          );
        }
      });

      return elements;
    };

    // 渲染棋子
    const renderPieces = () => {
      const pieces = [];
      const boardLeft = SIDE_EDGE;
      const boardTop = EDGE_SIZE;

      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
          const piece = board[row][col];
          if (!piece) continue;

          const isRed = piece === piece.toUpperCase();
          const pieceChar = piece.toLowerCase();
          const name = isRed ? PIECE_NAMES_RED[pieceChar] : PIECE_NAMES_BLACK[pieceChar];
          const cx = boardLeft + col * CELL_SIZE;
          const cy = boardTop + row * CELL_SIZE;

          const isLastFrom = lastMove && lastMove.from.row === row && lastMove.from.col === col;
          const isLastTo = lastMove && lastMove.to.row === row && lastMove.to.col === col;
          const isLastMove = isLastFrom || isLastTo;

          pieces.push(
            <g key={`p-${row}-${col}`}>
              {/* 棋子阴影 */}
              <circle
                cx={cx + 1}
                cy={cy + 2}
                r={PIECE_RADIUS}
                fill="rgba(0,0,0,0.3)"
              />
              {/* 棋子背景 */}
              <circle
                cx={cx}
                cy={cy}
                r={PIECE_RADIUS}
                fill={isRed ? '#F5E6D3' : '#E8D9B8'}
                stroke={isRed ? '#8B0000' : '#1a1a1a'}
                strokeWidth="2"
              />
              {/* 内圈 */}
              <circle
                cx={cx}
                cy={cy}
                r={PIECE_RADIUS - 4}
                fill="none"
                stroke={isRed ? '#8B0000' : '#1a1a1a'}
                strokeWidth="1"
              />
              {/* 最后一手高亮 */}
              {isLastMove && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={PIECE_RADIUS + 3}
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="3"
                />
              )}
              {/* 棋子文字 */}
              <text
                x={cx}
                y={cy + 9}
                textAnchor="middle"
                fontSize="26"
                fontWeight="bold"
                fontFamily="KaiTi, STKaiti, SimKai, serif"
                fill={isRed ? '#8B0000' : '#0a0a0a'}
                style={{ userSelect: 'none' }}
              >
                {name}
              </text>
            </g>
          );
        }
      }

      return pieces;
    };

    // 渲染边缘数字
    const renderEdgeNumbers = () => {
      const elements = [];
      const boardLeft = SIDE_EDGE;
      const boardTop = EDGE_SIZE;

      // 上方黑方数字（1~9 从左到右，对齐竖线）
      for (let col = 0; col < 9; col++) {
        const x = boardLeft + col * CELL_SIZE;
        const y = boardTop - 20; // 在第一排棋子上方
        elements.push(
          <text
            key={`top-${col}`}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="16"
            fontFamily="KaiTi, STKaiti, SimKai, serif"
            fontWeight="bold"
            fill="#4a2a0a"
          >
            {BLACK_COLS[col]}
          </text>
        );
      }

      // 下方红方数字（一~九 从右到左，对齐竖线）
      for (let col = 0; col < 9; col++) {
        const x = boardLeft + col * CELL_SIZE;
        const y = boardTop + 9 * CELL_SIZE + 36; // 在最后排棋子下方
        elements.push(
          <text
            key={`bottom-${col}`}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="16"
            fontFamily="KaiTi, STKaiti, SimKai, serif"
            fontWeight="bold"
            fill="#4a2a0a"
          >
            {RED_COLS[col]}
          </text>
        );
      }

      return elements;
    };

    return (
      <div
        ref={ref}
        className="relative"
        style={{
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          overflow: 'visible',
        }}
      >
        {/* 棋盘外框 */}
        <div
          className="absolute inset-0 rounded"
          style={{
            background: 'linear-gradient(135deg, #DEB887 0%, #D2B48C 50%, #C4A77D 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
            border: '3px solid #8B4513',
          }}
        />
        <svg
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          className="absolute top-0 left-0"
          style={{ overflow: 'visible' }}
        >
          {/* 楚河汉界 */}
          <text
            x={SIDE_EDGE + 1.5 * CELL_SIZE}
            y={EDGE_SIZE + 4.65 * CELL_SIZE}
            fontSize="24"
            fill="#5C2E18"
            fontFamily="KaiTi, STKaiti, SimKai, serif"
            fontWeight="bold"
            letterSpacing="16"
          >
            楚 河
          </text>
          <text
            x={SIDE_EDGE + 5.2 * CELL_SIZE}
            y={EDGE_SIZE + 4.65 * CELL_SIZE}
            fontSize="24"
            fill="#5C2E18"
            fontFamily="KaiTi, STKaiti, SimKai, serif"
            fontWeight="bold"
            letterSpacing="16"
          >
            漢 界
          </text>
          {renderGrid()}
          {renderPieces()}
          {renderEdgeNumbers()}
        </svg>
      </div>
    );
  }
);

ChessBoard.displayName = 'ChessBoard';

export default ChessBoard;
