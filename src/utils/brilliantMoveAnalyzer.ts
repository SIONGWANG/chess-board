/**
 * 神之一手分析器
 * 使用启发式规则找出棋谱中的精彩着法
 */

import type { ChessMove, ChessGame } from './chessParser';

// 棋子价值（用于评估吃子收益）
const PIECE_VALUE: Record<string, number> = {
  'k': 10000, // 将/帅
  'r': 900,   // 车
  'n': 400,   // 马
  'b': 200,   // 象/相
  'a': 200,   // 士/仕
  'c': 450,   // 炮
  'p': 100,   // 兵/卒
};

// 精彩着法阈值（分数超过此值才算精彩）
const BRILLIANT_THRESHOLD = 150;

// 最多返回的精彩着法数量
const MAX_BRILLIANT_MOVES = 10;

// 精彩着法类型
export interface BrilliantMove {
  moveIndex: number;
  move: ChessMove;
  score: number;
  type: BrilliantMoveType;
  reason: string;
  round: number;
  notation: string;
}

export type BrilliantMoveType = 
  | 'sacrifice'      // 弃子攻杀
  | 'discovery'      // 抽将/捉双
  | 'mate_in_one'    // 一步杀棋
  | 'counter_attack' // 反击妙手
  | 'brilliant_capture'; // 精彩吃子

/**
 * 检查是否是将军
 */
function isCheck(board: (string | null)[][], move: ChessMove, isRed: boolean): boolean {
  // 简化判断：如果走的是将/帅，或者走到对方将/帅旁边，可能是将军
  const piece = move.piece.toLowerCase();
  const targetRow = move.to.row;
  const targetCol = move.to.col;
  
  // 将/帅直接面对面（白脸将）
  if (piece === 'k') {
    // 查找对方将/帅
    const opponentKing = isRed ? 'k' : 'K';
    for (let row = 0; row < 10; row++) {
      for (let col = 3; col <= 5; col++) {
        if (board[row][col] === opponentKing) {
          // 检查是否在同一列且中间无子
          if (col === targetCol) {
            let blocked = false;
            const minRow = Math.min(targetRow, row);
            const maxRow = Math.max(targetRow, row);
            for (let r = minRow + 1; r < maxRow; r++) {
              if (board[r][col]) {
                blocked = true;
                break;
              }
            }
            if (!blocked) return true;
          }
        }
      }
    }
  }
  
  return false;
}

/**
 * 检查是否是抽将（一步棋同时将军和捉子）
 */
function isDiscoveredAttack(
  board: (string | null)[][],
  move: ChessMove,
  moves: ChessMove[],
  moveIndex: number
): boolean {
  // 简化判断：如果这步棋后，下一步是吃子或连续将军
  if (moveIndex + 2 < moves.length) {
    const nextMove = moves[moveIndex + 1];
    const nextNextMove = moves[moveIndex + 2];
    
    // 如果连续两步都是吃子或将军，可能是抽将
    if (nextMove.capturedPiece || nextNextMove.capturedPiece) {
      return true;
    }
  }
  return false;
}

/**
 * 检查是否是弃子（主动送吃）
 */
function isSacrifice(
  board: (string | null)[][],
  move: ChessMove,
  moves: ChessMove[],
  moveIndex: number
): boolean {
  // 如果这步棋没有吃子，但下一步被对方吃，且被吃的是大子
  if (!move.capturedPiece && moveIndex + 1 < moves.length) {
    const nextMove = moves[moveIndex + 1];
    // 检查下一步是否走到这步的位置
    if (nextMove.to.row === move.to.row && nextMove.to.col === move.to.col) {
      // 被吃的是大子（车马炮）
      const pieceType = move.piece.toLowerCase();
      if (pieceType === 'r' || pieceType === 'n' || pieceType === 'c') {
        return true;
      }
    }
  }
  return false;
}

/**
 * 检查是否是精彩吃子
 */
function isBrilliantCapture(move: ChessMove): boolean {
  if (!move.capturedPiece) return false;
  
  const attackerValue = PIECE_VALUE[move.piece.toLowerCase()] || 0;
  const capturedValue = PIECE_VALUE[move.capturedPiece.toLowerCase()] || 0;
  
  // 用小子吃大子（收益 > 200）
  return capturedValue - attackerValue > 200;
}

/**
 * 计算一步棋的精彩分数
 */
function calculateMoveScore(
  board: (string | null)[][],
  move: ChessMove,
  moves: ChessMove[],
  moveIndex: number
): { score: number; type: BrilliantMoveType; reason: string } {
  let score = 0;
  let type: BrilliantMoveType = 'brilliant_capture';
  let reason = '';
  
  // 1. 吃子分数
  if (move.capturedPiece) {
    const value = PIECE_VALUE[move.capturedPiece.toLowerCase()] || 0;
    score += value / 10;
    reason = `吃掉${move.capturedPiece === move.capturedPiece.toUpperCase() ? 
      (move.capturedPiece.toLowerCase() === 'r' ? '红车' : 
       move.capturedPiece.toLowerCase() === 'n' ? '红马' : '红炮') :
      (move.capturedPiece.toLowerCase() === 'r' ? '黑车' : 
       move.capturedPiece.toLowerCase() === 'n' ? '黑马' : '黑砲')}`;
  }
  
  // 2. 弃子分数（主动送吃大子）
  if (isSacrifice(board, move, moves, moveIndex)) {
    const sacrificeValue = PIECE_VALUE[move.piece.toLowerCase()] || 0;
    score += sacrificeValue / 5;
    type = 'sacrifice';
    reason = `弃${move.piece.toLowerCase() === 'r' ? '车' : 
              move.piece.toLowerCase() === 'n' ? '马' : '炮'}攻杀`;
  }
  
  // 3. 抽将/捉双分数
  if (isDiscoveredAttack(board, move, moves, moveIndex)) {
    score += 300;
    type = 'discovery';
    reason = '抽将捉双';
  }
  
  // 4. 精彩吃子（小子吃大子）
  if (isBrilliantCapture(move)) {
    const attackerValue = PIECE_VALUE[move.piece.toLowerCase()] || 0;
    const capturedValue = PIECE_VALUE[move.capturedPiece!.toLowerCase()] || 0;
    score += (capturedValue - attackerValue) / 10;
    type = 'brilliant_capture';
    reason = `妙手吃子，得子${capturedValue - attackerValue}`;
  }
  
  // 5. 将军加分（简化判断）
  if (move.piece.toLowerCase() === 'k') {
    score += 100;
  }
  
  // 6. 深度加分（越到后面越精彩）
  const depthBonus = (moveIndex / moves.length) * 50;
  score += depthBonus;
  
  return { score, type, reason };
}

/**
 * 分析棋谱，找出所有精彩着法（按分数排序）
 */
export function analyzeBrilliantMoves(game: ChessGame): BrilliantMove[] {
  if (!game || game.moves.length === 0) {
    return [];
  }
  
  const brilliantMoves: BrilliantMove[] = [];
  
  // 逐着分析
  for (let i = 0; i < game.moves.length; i++) {
    const move = game.moves[i];
    
    // 复制棋盘状态到这一步
    const board = game.initialBoard.map(row => [...row]);
    for (let j = 0; j <= i; j++) {
      const m = game.moves[j];
      board[m.to.row][m.to.col] = m.piece;
      board[m.from.row][m.from.col] = null;
    }
    
    // 计算分数
    const { score, type, reason } = calculateMoveScore(board, move, game.moves, i);
    
    // 只保留分数超过阈值的着法
    if (score >= BRILLIANT_THRESHOLD) {
      brilliantMoves.push({
        moveIndex: i,
        move,
        score,
        type,
        reason,
        round: Math.floor(i / 2) + 1,
        notation: move.notation,
      });
    }
  }
  
  // 按分数降序排序
  brilliantMoves.sort((a, b) => b.score - a.score);
  
  // 只返回前N个
  return brilliantMoves.slice(0, MAX_BRILLIANT_MOVES);
}

/**
 * 分析棋谱，找出最精彩的一着（兼容旧接口）
 */
export function analyzeBrilliantMove(game: ChessGame): BrilliantMove | null {
  const moves = analyzeBrilliantMoves(game);
  return moves.length > 0 ? moves[0] : null;
}

/**
 * 获取精彩着法的中文类型名称
 */
export function getBrilliantMoveTypeName(type: BrilliantMoveType): string {
  const names: Record<BrilliantMoveType, string> = {
    sacrifice: '弃子攻杀',
    discovery: '抽将捉双',
    mate_in_one: '一步杀棋',
    counter_attack: '反击妙手',
    brilliant_capture: '精彩吃子',
  };
  return names[type] || '精彩着法';
}
