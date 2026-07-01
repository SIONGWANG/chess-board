/**
 * DhtmlXQ 东萍象棋棋谱解析器
 * 按照官方解析规则实现
 * 
 * 核心规则：
 * 1. movelist 每2位数字 = 一步棋坐标
 * 2. 坐标XY：X=路数(列)，Y=横线(行)
 * 3. 红方视角从右至左：1~9路
 * 4. length = 总回合数（1回合=红1步+黑1步）
 */

// ==================== 常量定义 ====================

// 棋盘尺寸
const BOARD_COLS = 9;  // 9列（路1-9）
const BOARD_ROWS = 10; // 10行（线0-9）

// 红方棋子名称
const RED_NAMES: Record<string, string> = {
  k: '帅', r: '车', n: '马', b: '相', a: '仕', c: '炮', p: '兵'
};

// 黑方棋子名称
const BLACK_NAMES: Record<string, string> = {
  k: '将', r: '车', n: '馬', b: '象', a: '士', c: '砲', p: '卒'
};

// 红方列数表示（从右往左：一~九，col=0最左=九路，col=8最右=一路）
const RED_COLS = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];

// 黑方列数表示（从左往右：1~9，col=0最左=1路，col=8最右=9路）
const BLACK_COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// 红方步数表示
const RED_STEPS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// 黑方步数表示
const BLACK_STEPS = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// 棋子编码映射（binit编码 -> 棋子标识）
// 数字表示黑方（1-9），大写字母表示红方（A-Z）
const PIECE_MAP: Record<string, string> = {
  // 黑方：数字编码
  '1': 'r', // 黑车
  '2': 'n', // 黑马
  '3': 'b', // 黑象
  '4': 'a', // 黑士
  '5': 'c', // 黑炮
  '6': 'p', // 黑卒
  '7': 'p', // 黑卒(同6)
  '9': 'k', // 黑将
  
  // 红方：大写字母编码 (A-Z)
  'A': 'R', // 红车
  'B': 'N', // 红马
  'C': 'B', // 红相
  'D': 'A', // 红仕
  'E': 'C', // 红炮
  'F': 'P', // 红兵
  'G': 'P', // 红兵(同F)
  'H': 'P', // 红兵(同F)
  'I': 'K', // 红帅
  'J': 'K', // 红帅(同I)
  'K': 'K', // 红帅
  'L': 'R', // 红车(同A)
  'M': 'N', // 红马(同B)
  'N': 'B', // 红相(同C)
  'O': 'A', // 红仕(同D)
  'P': 'C', // 红炮(同E)
  'Q': 'P', // 红兵(同F)
  'R': 'P', // 红兵(同F)
};

// 标准开局布局（当binit解析失败时使用）
const STANDARD_INIT: (string | null)[][] = [
  ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'], // 黑方底线：车马象士将士象马车
  [null, null, null, null, null, null, null, null, null], // 行1
  [null, 'c', null, null, null, null, null, 'c', null],   // 行2：炮
  ['p', null, 'p', null, 'p', null, 'p', null, 'p'],     // 行3：卒
  [null, null, null, null, null, null, null, null, null], // 行4
  [null, null, null, null, null, null, null, null, null], // 行5
  ['P', null, 'P', null, 'P', null, 'P', null, 'P'],     // 行6：兵
  [null, 'C', null, null, null, null, null, 'C', null],   // 行7：炮
  [null, null, null, null, null, null, null, null, null], // 行8
  ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R'], // 红方底线：车马相仕帅仕相马车
];

// ==================== 类型定义 ====================

export interface ChessMove {
  from: { col: number; row: number }; // col=路数(1-9), row=横线(0-9)
  to: { col: number; row: number };
  piece: string;        // 棋子标识 (r/n/b/a/k/c/p 大写红，小写黑)
  notation: string;     // 标准招法文字，如"兵七进一"
  isRed: boolean;
  capturedPiece?: string | null;
}

export interface ChessGame {
  title: string;
  red: string;
  black: string;
  result: string;
  event: string;
  open: string;
  date: string;
  timerule: string;
  length: number;
  moves: ChessMove[];
  initialBoard: (string | null)[][];
  moveTexts: { round: number; red: string; black: string }[]; // 回合制文字棋谱
}

export interface ParseResult {
  success: boolean;
  game?: ChessGame;
  error?: string;
}

export interface DpxqChessItem {
  id: string;
  year: number;
  event: string;
  redPlayer: string;
  blackPlayer: string;
  moves: string[];
  rawMovesText: string;
  title: string;
  result: string;
  open: string;
  date: string;
}

// ==================== 辅助函数 ====================

/**
 * 深度复制二维数组
 */
function copyBoard(board: (string | null)[][]): (string | null)[][] {
  return board.map(row => [...row]);
}

/**
 * 判断棋子是否红方
 */
function isRedPiece(piece: string): boolean {
  return piece === piece.toUpperCase();
}

/**
 * 获取棋子中文名称
 */
function getPieceName(piece: string, isRed: boolean): string {
  const lower = piece.toLowerCase();
  return isRed ? RED_NAMES[lower] || piece : BLACK_NAMES[lower] || piece;
}

/**
 * 验证坐标是否在棋盘范围内
 */
function isValidPos(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

/**
 * 查找棋盘上指定位置的棋子
 */
function getPieceAt(board: (string | null)[][], col: number, row: number): string | null {
  if (!isValidPos(col, row)) return null;
  return board[row][col];
}

/**
 * 查找某个棋子在棋盘上的位置
 */
function findPiecePosition(
  board: (string | null)[][],
  piece: string,
  targetCol: number,
  targetRow: number
): { col: number; row: number } | null {
  // 在目标位置找棋子（因为我们要找的是移动到这个位置的棋子）
  const found = board[targetRow][targetCol];
  if (found && found.toLowerCase() === piece.toLowerCase()) {
    return { col: targetCol, row: targetRow };
  }
  return null;
}

/**
 * 计算两点之间的步数（用于进退）
 */
function calcSteps(fromRow: number, toRow: number, isRed: boolean): number {
  return Math.abs(toRow - fromRow);
}

// ==================== 核心解析函数 ====================

/**
 * 解析binit编码，初始化棋盘
 */
function parseBinit(binit: string): (string | null)[][] {
  // 如果 binit 太短无法填满棋盘，使用标准开局
  if (binit.length < 80) {
    console.warn('binit太短，使用标准开局:', binit.length);
    return copyBoard(STANDARD_INIT);
  }
  
  const board: (string | null)[][] = Array(BOARD_ROWS)
    .fill(null)
    .map(() => Array(BOARD_COLS).fill(null));

  // binit是连续字符串，逐位填充
  let pos = 0;
  for (let row = 0; row < BOARD_ROWS && pos < binit.length; row++) {
    for (let col = 0; col < BOARD_COLS && pos < binit.length; col++) {
      const ch = binit[pos];
      if (ch === '0') {
        board[row][col] = null;
      } else {
        const mapped = PIECE_MAP[ch];
        if (mapped) {
          board[row][col] = mapped;
        }
      }
      pos++;
    }
  }

  // 验证棋盘是否有将帅
  let hasKing = false;
  outer:
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (board[row][col]?.toLowerCase() === 'k') {
        hasKing = true;
        break outer;
      }
    }
  }

  if (hasKing) {
    return board;
  }

  // 解析失败，使用标准开局
  console.warn('binit解析失败，使用标准开局');
  return copyBoard(STANDARD_INIT);
}

/**
 * 从movelist提取坐标对列表
 * 每2位数字 = 一步棋坐标
 */
function parseMovePositions(movveList: string, expectedLength: number): { col: number; row: number }[] {
  const positions: { col: number; row: number }[] = [];
  
  // 清理字符串，只保留数字
  const digits = movveList.replace(/\D/g, '');
  
  // 每2位 = 一步
  for (let i = 0; i + 2 <= digits.length; i += 2) {
    const col = parseInt(digits[i], 10);     // X = 路数
    const row = parseInt(digits[i + 1], 10); // Y = 横线
    positions.push({ col, row });
  }
  
  return positions;
}

/**
 * 生成标准象棋招法文字
 * 
 * @param board 当前棋盘状态
 * @param fromCol 起点路数
 * @param fromRow 起点横线
 * @param toCol 终点路数
 * @param toRow 终点横线
 * @param isRed 是否红方
 */
function generateNotation(
  board: (string | null)[][],
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  isRed: boolean
): string {
  const piece = board[fromRow][fromCol];
  if (!piece) return '??';

  const pieceType = piece.toLowerCase();
  const pieceName = getPieceName(piece, isRed);
  
  // 列数名称（红黑不同）
  const getColName = (col: number): string => {
    if (isRed) {
      return RED_COLS[col];
    } else {
      return BLACK_COLS[col];
    }
  };
  
  // 步数名称
  const getStepName = (steps: number): string => {
    return isRed ? RED_STEPS[steps] : BLACK_STEPS[steps];
  };

  // 判断是平还是进退
  const isHorizontal = fromRow === toRow; // 同行 = 平
  const isVertical = fromCol === toCol;   // 同列 = 进退
  
  let action: string;
  let detail: string;
  
  if (isHorizontal) {
    // 平：不同列，同行
    action = '平';
    detail = getColName(toCol);
  } else if (isVertical) {
    // 进退：同列，不同行
    if (isRed) {
      // 红方：row减小=进（向黑方），row增大=退
      action = toRow < fromRow ? '进' : '退';
    } else {
      // 黑方：row增大=进（向红方），row减小=退
      action = toRow > fromRow ? '进' : '退';
    }
    const steps = Math.abs(toRow - fromRow);
    detail = getStepName(steps);
  } else {
    // 斜走（马或士象），统一用进
    action = '进';
    detail = getColName(toCol);
  }

  // 对于车炮马等，需要处理同列/同行多棋子的情况
  // 这里简化为基本格式
  let notation = pieceName + getColName(fromCol) + action + detail;
  
  console.log(`generateNotation: isRed=${isRed}, piece=${piece}, pieceName=${pieceName}, fromCol=${fromCol}, colName=${getColName(fromCol)}, action=${action}, detail=${detail}, notation=${notation}`);
  
  return notation;
}

/**
 * 执行一步棋，更新棋盘
 */
function applyMove(
  board: (string | null)[][],
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number
): string | null {
  const piece = board[fromRow][fromCol];
  if (!piece) return null;
  
  const captured = board[toRow][toCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;
  
  return captured;
}

// ==================== 主解析函数 ====================

/**
 * 提取两个标签之间的内容
 */
function extractTag(content: string, tagName: string): string {
  const startTag = `[${tagName}]`;
  const endTag = `[/${tagName}]`;
  const startIdx = content.indexOf(startTag);
  if (startIdx === -1) return '';
  const contentStart = startIdx + startTag.length;
  const endIdx = content.indexOf(endTag, contentStart);
  if (endIdx === -1) return '';
  return content.substring(contentStart, endIdx);
}

/**
 * 解析DhtmlXQ格式棋谱
 */
export function parseDhtmlXQ(data: string): ParseResult {
  try {
    // 1. 文本清洗：去除换行空格
    const cleaned = data.replace(/[\r\n\s]/g, '');
    
    // 2. 验证外层包裹
    if (!cleaned.includes('[DhtmlXQ]') || !cleaned.includes('[/DhtmlXQ]')) {
      return { success: false, error: '不是有效的DhtmlXQ格式棋谱' };
    }
    
    // 3. 提取整个棋谱内容
    const outerStart = cleaned.indexOf('[DhtmlXQ]');
    const outerEnd = cleaned.indexOf('[/DhtmlXQ]') + '[/DhtmlXQ]'.length;
    const gameContent = cleaned.substring(outerStart + '[DhtmlXQ]'.length, outerEnd - '[/DhtmlXQ]'.length);
    
    // 4. 提取所有标签
    const tagNames = [
      'DhtmlXQ_movelist', 'DhtmlXQ_length', 'DhtmlXQ_binit',
      'DhtmlXQ_title', 'DhtmlXQ_red', 'DhtmlXQ_black', 'DhtmlXQ_result',
      'DhtmlXQ_event', 'DhtmlXQ_open', 'DhtmlXQ_date', 'DhtmlXQ_timerule',
      'DhtmlXQ_redname', 'DhtmlXQ_blackname', 'DhtmlXQ_redteam', 'DhtmlXQ_blackteam'
    ];
    
    const tags: Record<string, string> = {};
    for (const name of tagNames) {
      tags[name] = extractTag(gameContent, name);
    }
    
    // 调试
    console.log('提取到的标签数量:', tagNames.filter(t => tags[t]).length);
    console.log('movelist长度:', tags['DhtmlXQ_movelist']?.length);
    
    // 5. 提取关键字段
    const movelist = tags['DhtmlXQ_movelist'] || '';
    const lengthStr = tags['DhtmlXQ_length'] || '';
    const binit = tags['DhtmlXQ_binit'] || '';
    
    if (!movelist) {
      console.log('清洗后文本前200:', cleaned.substring(0, 200));
      return { success: false, error: '缺失movelist字段' };
    }
    
    const totalSteps = parseInt(lengthStr, 10) || 0;
    const totalRounds = Math.ceil(totalSteps / 2);
    
    // 5. 长度校验：每步棋4个字符（起点2位+终点2位）
    const expectedLen = totalSteps * 4;
    const actualLen = movelist.replace(/\D/g, '').length;
    
    if (actualLen !== expectedLen && totalSteps > 0) {
      console.warn(`长度警告: 期望${expectedLen}位，实际${actualLen}位`);
      // 不强制报错，继续解析
    }
    
    // 6. 初始化棋盘
    const initialBoard = binit ? parseBinit(binit) : copyBoard(STANDARD_INIT);
    
    // 7. 解析坐标列表
    const positions = parseMovePositions(movelist, totalSteps);
    
    // 8. 逐步推演
    const moves: ChessMove[] = [];
    const moveTexts: { round: number; red: string; black: string }[] = [];
    let board = copyBoard(initialBoard);
    
    // positions 中每2个元素 = 一步棋（from, to）
    // 偶数步（0,2,4...）= 红方，奇数步（1,3,5...）= 黑方
    const stepCount = Math.floor(positions.length / 2);
    
    for (let stepIdx = 0; stepIdx < stepCount; stepIdx++) {
      const from = positions[stepIdx * 2];
      const to = positions[stepIdx * 2 + 1];
      const isRed = stepIdx % 2 === 0; // 第0步红，第1步黑，第2步红...
      const round = Math.floor(stepIdx / 2) + 1;
      
      const piece = board[from.row][from.col];
      if (!piece) continue;
      
      const notation = generateNotation(board, from.col, from.row, to.col, to.row, isRed);
      const captured = applyMove(board, from.col, from.row, to.col, to.row);
      
      moves.push({
        from: { col: from.col, row: from.row },
        to: { col: to.col, row: to.row },
        piece,
        notation,
        isRed,
        capturedPiece: captured
      });
      
      // 保存回合文字
      if (isRed) {
        if (moveTexts.length < round) {
          moveTexts.push({ round, red: notation, black: '' });
        } else if (moveTexts[round - 1]) {
          moveTexts[round - 1].red = notation;
        }
      } else {
        if (moveTexts[round - 1]) {
          moveTexts[round - 1].black = notation;
        }
      }
    }
    
    // 9. 组装结果
    const game: ChessGame = {
      title: tags['DhtmlXQ_title'] || '',
      red: tags['DhtmlXQ_red'] || tags['DhtmlXQ_redname'] || '',
      black: tags['DhtmlXQ_black'] || tags['DhtmlXQ_blackname'] || '',
      result: tags['DhtmlXQ_result'] || '',
      event: tags['DhtmlXQ_event'] || '',
      open: tags['DhtmlXQ_open'] || '',
      date: tags['DhtmlXQ_date'] || '',
      timerule: tags['DhtmlXQ_timerule'] || '',
      length: totalRounds,
      moves,
      initialBoard,
      moveTexts
    };
    
    console.log('解析完成，总步数:', moves.length, '红方步数:', moves.filter(m=>m.isRed).length, '黑方步数:', moves.filter(m=>!m.isRed).length);
    
    return { success: true, game };
    
  } catch (error) {
    return { 
      success: false, 
      error: `解析异常: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * 获取指定步数后的棋盘状态
 */
export function getBoardAfterMoves(
  initialBoard: (string | null)[][],
  moves: ChessMove[],
  moveIndex: number
): (string | null)[][] {
  let board = copyBoard(initialBoard);
  
  for (let i = 0; i <= moveIndex && i < moves.length; i++) {
    const m = moves[i];
    board[m.to.row][m.to.col] = m.piece;
    board[m.from.row][m.from.col] = null;
  }
  
  return board;
}

/**
 * 打印完整文字对局（测试用）
 */
export function printGameText(game: ChessGame): void {
  console.log('='.repeat(40));
  console.log(`对局: ${game.title}`);
  console.log(`红方: ${game.red}`);
  console.log(`黑方: ${game.black}`);
  console.log(`结果: ${game.result}`);
  console.log(`赛事: ${game.event}`);
  console.log(`开局: ${game.open}`);
  console.log(`日期: ${game.date}`);
  console.log(`用时: ${game.timerule}`);
  console.log('='.repeat(40));
  
  console.log('\n文字棋谱:');
  for (const mt of game.moveTexts) {
    console.log(`${String(mt.round).padStart(2)}. ${mt.red.padEnd(8)} ${mt.black}`);
  }
  
  console.log('\n' + '='.repeat(40));
  console.log(`共 ${game.moves.length} 步`);
}

// ==================== 测试代码 ====================

// 洪智 vs 徐天红 棋谱
const TEST_PGN = `[DhtmlXQ]
[DhtmlXQ_ver]www_dpxq_com[/DhtmlXQ_ver]
[DhtmlXQ_init]500,350[/DhtmlXQ_init]
[DhtmlXQ_binit]8979695949392919097717866646260600102030405060708012720323436383[/DhtmlXQ_binit]
[DhtmlXQ_pver]130606[/DhtmlXQ_pver]
[DhtmlXQ_adddate]2021-12-06 15:53:45[/DhtmlXQ_adddate]
[DhtmlXQ_editdate]2021-12-06 15:53:45[/DhtmlXQ_editdate]
[DhtmlXQ_title]湖北 洪智 胜 江苏 徐天红[/DhtmlXQ_title]
[DhtmlXQ_movelist]2625122279672324294724256665204267551031898800108838808119077082394825353835727535322224553410123233757333033152173781110726121909191119483950413717838417184344030573740515190906056364656452641565091959486452777874342634242878281918652582632523635534135536483744454645365749595745132140502858[/DhtmlXQ_movelist]
[DhtmlXQ_firstnum]0[/DhtmlXQ_firstnum]
[DhtmlXQ_length]73[/DhtmlXQ_length]
[DhtmlXQ_type]全局[/DhtmlXQ_type]
[DhtmlXQ_gametype]快棋[/DhtmlXQ_gametype]
[DhtmlXQ_other]第3局[/DhtmlXQ_other]
[DhtmlXQ_open]E10 仙人指路对卒底炮[/DhtmlXQ_open]
[DhtmlXQ_class]其他大师或以上级别大赛[/DhtmlXQ_class]
[DhtmlXQ_event]2021年第10届碧桂园杯全国象棋冠军邀请赛[/DhtmlXQ_event]
[DhtmlXQ_place]顺德碧桂园度假村[/DhtmlXQ_place]
[DhtmlXQ_timerule]10分＋10秒[/DhtmlXQ_timerule]
[DhtmlXQ_round]第01轮[/DhtmlXQ_round]
[DhtmlXQ_table]第07台[/DhtmlXQ_table]
[DhtmlXQ_date]2021-12-05[/DhtmlXQ_date]
[DhtmlXQ_result]红胜[/DhtmlXQ_result]
[DhtmlXQ_red]湖北 洪智[/DhtmlXQ_red]
[DhtmlXQ_redteam]湖北[/DhtmlXQ_redteam]
[DhtmlXQ_redname]洪智[/DhtmlXQ_redname]
[DhtmlXQ_black]江苏 徐天红[/DhtmlXQ_black]
[DhtmlXQ_blackteam]江苏[/DhtmlXQ_blackteam]
[DhtmlXQ_blackname]徐天红[/DhtmlXQ_blackname]
[DhtmlXQ_hits]4141[/DhtmlXQ_hits]
[DhtmlXQ_sortid]1160530[/DhtmlXQ_sortid]
[DhtmlXQ_owner]东萍公司[/DhtmlXQ_owner]
[DhtmlXQ_oldowner]东萍公司[/DhtmlXQ_oldowner]
[DhtmlXQ_comment0]第3局[/DhtmlXQ_comment0]
[DhtmlXQ_refer]http%3A//www.dpxq.com/%0D%0Ahttp%3A//www.dpxq.com/hldcg/search/view_m_116053.html[/DhtmlXQ_refer]
[DhtmlXQ_generator][/DhtmlXQ_generator]
[/DhtmlXQ]`;

// 执行测试
if (typeof window === 'undefined') {
  // Node.js 环境
  const result = parseDhtmlXQ(TEST_PGN);
  if (result.success && result.game) {
    printGameText(result.game);
  } else {
    console.error('解析失败:', result.error);
  }
}

// ==================== 扩展解析方法 ====================

export function parseXQFText(xqfRaw: string): ParseResult {
  try {
    const lines = xqfRaw.split('\n').map(l => l.trim());
    
    const getTag = (tag: string): string => {
      const prefix = `[${tag}]`;
      const line = lines.find(l => l.startsWith(prefix));
      return line ? line.substring(prefix.length) : '';
    };
    
    const event = getTag('Event');
    const date = getTag('Date');
    const red = getTag('Red');
    const black = getTag('Black');
    const result = getTag('Result');
    const open = getTag('Opening');
    
    const movesStart = lines.findIndex(l => l === '[Moves]');
    const movesEnd = lines.findIndex((l, i) => i > movesStart && l === '[/XQF]');
    
    const moveLines = movesStart >= 0 && movesEnd >= 0 
      ? lines.slice(movesStart + 1, movesEnd) 
      : [];
    
    const moves: ChessMove[] = [];
    const moveTexts: { round: number; red: string; black: string }[] = [];
    
    for (const line of moveLines) {
      const match = line.match(/^(\d+)\.\s*([^\s]+)\s*([^\s]*)/);
      if (match) {
        const round = parseInt(match[1], 10);
        const redNotation = match[2];
        const blackNotation = match[3] || '';
        
        moves.push({
          from: { col: 0, row: 0 },
          to: { col: 0, row: 0 },
          piece: getPieceFromNotation(redNotation, true),
          notation: redNotation,
          isRed: true,
        });
        
        if (blackNotation && blackNotation !== '-') {
          moves.push({
            from: { col: 0, row: 0 },
            to: { col: 0, row: 0 },
            piece: getPieceFromNotation(blackNotation, false),
            notation: blackNotation,
            isRed: false,
          });
        }
        
        moveTexts.push({ round, red: redNotation, black: blackNotation });
      }
    }
    
    const game: ChessGame = {
      title: `${red} vs ${black}`,
      red,
      black,
      result,
      event,
      open,
      date,
      timerule: '',
      length: moveTexts.length,
      moves,
      initialBoard: copyBoard(STANDARD_INIT),
      moveTexts,
    };
    
    return { success: true, game };
    
  } catch (error) {
    return { 
      success: false, 
      error: `XQF解析异常: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

export function parseDpxqJson(chessJson: DpxqChessItem): ParseResult {
  try {
    const moves: ChessMove[] = [];
    const moveTexts: { round: number; red: string; black: string }[] = [];
    
    const initialBoard = copyBoard(STANDARD_INIT);
    let board = copyBoard(initialBoard);
    
    if (chessJson.rawMovesText) {
      const positions = parseMovePositions(chessJson.rawMovesText, 0);
      const stepCount = Math.floor(positions.length / 2);
      
      for (let stepIdx = 0; stepIdx < stepCount; stepIdx++) {
        const from = positions[stepIdx * 2];
        const to = positions[stepIdx * 2 + 1];
        const isRed = stepIdx % 2 === 0;
        const round = Math.floor(stepIdx / 2) + 1;
        
        const piece = board[from.row][from.col];
        if (!piece) continue;
        
        const notation = generateNotation(board, from.col, from.row, to.col, to.row, isRed);
        const captured = applyMove(board, from.col, from.row, to.col, to.row);
        
        moves.push({
          from: { col: from.col, row: from.row },
          to: { col: to.col, row: to.row },
          piece,
          notation,
          isRed,
          capturedPiece: captured
        });
        
        if (isRed) {
          if (moveTexts.length < round) {
            moveTexts.push({ round, red: notation, black: '' });
          } else if (moveTexts[round - 1]) {
            moveTexts[round - 1].red = notation;
          }
        } else {
          if (moveTexts[round - 1]) {
            moveTexts[round - 1].black = notation;
          }
        }
      }
    } else {
      for (let i = 0; i < chessJson.moves.length; i += 2) {
        const round = Math.floor(i / 2) + 1;
        const redNotation = chessJson.moves[i] || '';
        const blackNotation = chessJson.moves[i + 1] || '';
        
        if (redNotation) {
          moves.push({
            from: { col: 0, row: 0 },
            to: { col: 0, row: 0 },
            piece: getPieceFromNotation(redNotation, true),
            notation: redNotation,
            isRed: true,
          });
        }
        
        if (blackNotation) {
          moves.push({
            from: { col: 0, row: 0 },
            to: { col: 0, row: 0 },
            piece: getPieceFromNotation(blackNotation, false),
            notation: blackNotation,
            isRed: false,
          });
        }
        
        moveTexts.push({ round, red: redNotation, black: blackNotation });
      }
    }
    
    const game: ChessGame = {
      title: chessJson.title || `${chessJson.redPlayer} vs ${chessJson.blackPlayer}`,
      red: chessJson.redPlayer,
      black: chessJson.blackPlayer,
      result: chessJson.result,
      event: chessJson.event,
      open: chessJson.open,
      date: chessJson.date,
      timerule: '',
      length: moveTexts.length,
      moves,
      initialBoard,
      moveTexts,
    };
    
    return { success: true, game };
    
  } catch (error) {
    return { 
      success: false, 
      error: `DpxqJson解析异常: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

function getPieceFromNotation(notation: string, isRed: boolean): string {
  const firstChar = notation.charAt(0);
  
  const redMap: Record<string, string> = {
    '帅': 'K', '车': 'R', '马': 'N', '相': 'B', '仕': 'A', '炮': 'C', '兵': 'P'
  };
  
  const blackMap: Record<string, string> = {
    '将': 'k', '車': 'r', '馬': 'n', '象': 'b', '士': 'a', '砲': 'c', '卒': 'p',
    '车': 'r', '马': 'n', '炮': 'c'
  };
  
  if (isRed) {
    return redMap[firstChar] || 'P';
  } else {
    return blackMap[firstChar] || 'p';
  }
}
