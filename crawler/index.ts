import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'http://www.dpxq.com';
const SEARCH_URL = `${BASE_URL}/hldcg/search`;
const DATA_DIR = path.join(__dirname, '../chess_data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const XQF_DIR = path.join(DATA_DIR, 'xqf');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': BASE_URL,
  'Connection': 'keep-alive',
};

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

export interface ChessIndexItem {
  id: string;
  year: number;
  event: string;
  redPlayer: string;
  blackPlayer: string;
  title: string;
  result: string;
}

export interface GameListItem {
  id: string;
  redPlayer: string;
  blackPlayer: string;
  event: string;
  date: string;
  result: string;
}

interface CrawlError {
  url: string;
  error: string;
  timestamp: number;
}

function delay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHtml(url: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      const response = await axios.get(url, {
        headers: HEADERS,
        timeout: 15000,
        responseType: 'arraybuffer',
      });
      
      return iconv.decode(response.data, 'gbk');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (retry < maxRetries - 1) {
        const waitTime = Math.pow(2, retry) * 1000 + Math.random() * 1000;
        console.log(`  请求失败，重试 ${retry + 1}/${maxRetries}，等待 ${waitTime.toFixed(0)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`请求失败 (已重试${maxRetries}次): ${url} - ${lastError?.message}`);
}

async function fetchYearLinks(): Promise<number[]> {
  console.log('正在获取年份列表...');
  
  const url = `${SEARCH_URL}/date.asp?owner=m`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  
  const years: number[] = [];
  
  $('a').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim();
    
    const yearMatch = text.match(/^(\d{4})$/);
    if (href && href.includes('year=') && yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 2000 && year <= 2026) {
        years.push(year);
      }
    }
  });
  
  console.log(`获取到 ${years.length} 个年份`);
  return years;
}

async function fetchMonthLinks(year: number): Promise<string[]> {
  console.log(`  获取 ${year} 年月份列表...`);
  
  const url = `${SEARCH_URL}/date.asp?owner=m&year=${year}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  
  const months: string[] = [];
  
  $('a').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim();
    
    const monthMatch = text.match(/^(\d{4}-\d{2})$/);
    if (href && href.includes('month=') && monthMatch) {
      months.push(monthMatch[1]);
    }
  });
  
  console.log(`    ${year} 年有 ${months.length} 个月份`);
  return months;
}

async function fetchDateLinks(year: number, month: string): Promise<string[]> {
  console.log(`    获取 ${month} 日期列表...`);
  
  const url = `${SEARCH_URL}/date.asp?owner=m&year=${year}&month=${month}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  
  const dates: string[] = [];
  
  $('a').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim();
    
    const dateMatch = text.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (href && href.includes('date=') && dateMatch) {
      dates.push(dateMatch[1]);
    }
  });
  
  return dates;
}

async function fetchGameIds(year: number, month: string, date: string): Promise<GameListItem[]> {
  const games: GameListItem[] = [];
  let page = 1;
  
  while (true) {
    try {
      const dateParam = date.replace(/-/g, '%2D');
      const nestedUrl = `${SEARCH_URL}/?s=date.asp%3Fowner%3Dm%26year%3D${year}%26month%3D${dateParam}%26date%3D${dateParam}%26page%3D${page}`;
      
      const html = await fetchHtml(nestedUrl);
      const $ = cheerio.load(html);
      
      const iframeSrc = $('iframe[name="search_end_pos"]').attr('src');
      
      if (!iframeSrc) {
        break;
      }
      
      let iframeUrl = iframeSrc;
      if (!iframeUrl.startsWith('http')) {
        if (iframeUrl.startsWith('/')) {
          iframeUrl = BASE_URL + iframeUrl;
        } else {
          iframeUrl = `${SEARCH_URL}/${iframeSrc}`;
        }
      }
      
      const iframeHtml = await fetchHtml(iframeUrl);
      const $iframe = cheerio.load(iframeHtml);
      
      let found = false;
      
      $iframe('table').eq(1).find('tr').each((_, tr) => {
        const cells = $iframe(tr).find('td');
        if (cells.length === 3) {
          const link = $iframe(cells[0]).find('a');
          if (link.length > 0) {
            const href = link.attr('href') || '';
            const idMatch = href.match(/javascript:view\('owner=m&id=(\d+)/) || 
                            href.match(/javascript:fcview\('owner=m&id=(\d+)/);
            
            if (idMatch) {
              const id = idMatch[1];
              const titleCell = $iframe(cells[1]).text().trim();
              
              const parts = titleCell.split(/\s+/);
              let redPlayer = '';
              let blackPlayer = '';
              let result = '';
              
              const resultIndex = parts.findIndex(p => ['鍜?', '鑳?', '璐?', '胜', '负', '和'].includes(p));
              if (resultIndex !== -1) {
                result = parts[resultIndex];
                redPlayer = parts.slice(0, resultIndex).join(' ');
                blackPlayer = parts.slice(resultIndex + 1).join(' ');
              } else {
                redPlayer = titleCell;
              }
              
              games.push({
                id,
                redPlayer,
                blackPlayer,
                event: '',
                date,
                result,
              });
              found = true;
            }
          }
        }
      });
      
      if (!found && page > 1) {
        break;
      }
      
      page++;
      await delay(800, 1500);
    } catch (error) {
      console.warn(`      获取棋谱列表失败: ${error}`);
      break;
    }
  }
  
  return games;
}

async function fetchGameDetail(game: GameListItem): Promise<DpxqChessItem | null> {
  try {
    const url = `${SEARCH_URL}/view.asp?owner=m&id=${game.id}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    const title = $('title').text().trim() || '';
    
    let scriptContent = '';
    $('script').each((_, element) => {
      const content = $(element).html() || '';
      if (content.includes('DhtmlXQ_movelist')) {
        scriptContent = content;
      }
    });
    
    const extractTag = (tagName: string): string => {
      const start = scriptContent.indexOf(`[${tagName}]`);
      if (start === -1) return '';
      const contentStart = start + `[${tagName}]`.length;
      const end = scriptContent.indexOf(`[/${tagName}]`, contentStart);
      if (end === -1) return '';
      return scriptContent.substring(contentStart, end);
    };
    
    const movelist = extractTag('DhtmlXQ_movelist');
    const event = extractTag('DhtmlXQ_event');
    const open = extractTag('DhtmlXQ_open');
    
    if (!movelist) {
      console.warn(`    ✗ 棋谱 ${game.id} 缺少 movelist`);
      return null;
    }
    
    const moves = parseMovesFromMovelist(movelist);
    
    return {
      id: game.id,
      year: game.date ? parseInt(game.date.substring(0, 4), 10) : new Date().getFullYear(),
      event: event || game.event,
      redPlayer: game.redPlayer,
      blackPlayer: game.blackPlayer,
      moves,
      rawMovesText: movelist,
      title,
      result: game.result,
      open,
      date: game.date,
    };
  } catch (error) {
    console.warn(`    ✗ 获取棋谱 ${game.id} 失败: ${error}`);
    return null;
  }
}

function parseMovesFromMovelist(movelist: string): string[] {
  const moves: string[] = [];
  
  if (!movelist) return moves;
  
  const digits = movelist.replace(/\D/g, '');
  
  for (let i = 0; i + 4 <= digits.length; i += 4) {
    const fromCol = parseInt(digits[i], 10);
    const fromRow = parseInt(digits[i + 1], 10);
    const toCol = parseInt(digits[i + 2], 10);
    const toRow = parseInt(digits[i + 3], 10);
    
    const isRed = i / 4 % 2 === 0;
    const notation = convertToNotation(fromCol, fromRow, toCol, toRow, isRed);
    if (notation !== '??') {
      moves.push(notation);
    }
  }
  
  return moves;
}

const RED_COLS = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];
const BLACK_COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const RED_STEPS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const BLACK_STEPS = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const RED_NAMES: Record<string, string> = {
  k: '帅', r: '车', n: '马', b: '相', a: '仕', c: '炮', p: '兵'
};

const BLACK_NAMES: Record<string, string> = {
  k: '将', r: '车', n: '馬', b: '象', a: '士', c: '砲', p: '卒'
};

function convertToNotation(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  isRed: boolean
): string {
  const board = generateStandardBoard();
  const piece = board[fromRow][fromCol];
  
  if (!piece) return '??';
  
  const pieceType = piece.toLowerCase();
  const pieceName = isRed ? RED_NAMES[pieceType] || pieceType : BLACK_NAMES[pieceType] || pieceType;
  
  const getColName = (col: number): string => {
    if (col < 0 || col > 8) return String(col);
    return isRed ? RED_COLS[col] : BLACK_COLS[col];
  };
  
  const getStepName = (steps: number): string => {
    if (steps < 0 || steps > 9) return String(steps);
    return isRed ? RED_STEPS[steps] : BLACK_STEPS[steps];
  };
  
  const isHorizontal = fromRow === toRow;
  const isVertical = fromCol === toCol;
  
  let action: string;
  let detail: string;
  
  if (isHorizontal) {
    action = '平';
    detail = getColName(toCol);
  } else if (isVertical) {
    if (isRed) {
      action = toRow < fromRow ? '进' : '退';
    } else {
      action = toRow > fromRow ? '进' : '退';
    }
    const steps = Math.abs(toRow - fromRow);
    detail = getStepName(steps);
  } else {
    action = '进';
    detail = getColName(toCol);
  }
  
  return pieceName + getColName(fromCol) + action + detail;
}

function generateStandardBoard(): (string | null)[][] {
  return [
    ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'],
    [null, null, null, null, null, null, null, null, null],
    [null, 'c', null, null, null, null, null, 'c', null],
    ['p', null, 'p', null, 'p', null, 'p', null, 'p'],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ['P', null, 'P', null, 'P', null, 'P', null, 'P'],
    [null, 'C', null, null, null, null, null, 'C', null],
    [null, null, null, null, null, null, null, null, null],
    ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R'],
  ];
}

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
  if (!fs.existsSync(XQF_DIR)) fs.mkdirSync(XQF_DIR, { recursive: true });
}

function loadErrorLog(): CrawlError[] {
  const filePath = path.join(DATA_DIR, 'errorLog.json');
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveErrorLog(errors: CrawlError[]): void {
  const filePath = path.join(DATA_DIR, 'errorLog.json');
  fs.writeFileSync(filePath, JSON.stringify(errors, null, 2), 'utf-8');
}

function saveYearData(year: number, items: DpxqChessItem[]): void {
  const filePath = path.join(RAW_DIR, `${year}.json`);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  
  for (const item of items) {
    const xqfPath = path.join(XQF_DIR, `${item.id}.xqf`);
    const xqfContent = generateXQF(item);
    fs.writeFileSync(xqfPath, xqfContent, 'utf-8');
  }
  
  console.log(`    已保存 ${items.length} 局棋谱`);
}

function generateXQF(item: DpxqChessItem): string {
  let content = '';
  content += `[XQF]\n`;
  content += `[Event]${item.event}\n`;
  content += `[Date]${item.date}\n`;
  content += `[Red]${item.redPlayer}\n`;
  content += `[Black]${item.blackPlayer}\n`;
  content += `[Result]${item.result}\n`;
  content += `[Opening]${item.open}\n`;
  content += `[Moves]\n`;
  
  for (let i = 0; i < item.moves.length; i += 2) {
    const round = Math.floor(i / 2) + 1;
    const redMove = item.moves[i] || '-';
    const blackMove = item.moves[i + 1] || '-';
    content += `${round}. ${redMove} ${blackMove}\n`;
  }
  
  content += `[/XQF]\n`;
  return content;
}

function buildFullIndex(allGames: DpxqChessItem[]): ChessIndexItem[] {
  return allGames.map(game => ({
    id: game.id,
    year: game.year,
    event: game.event,
    redPlayer: game.redPlayer,
    blackPlayer: game.blackPlayer,
    title: game.title,
    result: game.result,
  }));
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('东萍象棋网棋谱爬虫工具');
  console.log('='.repeat(60));
  console.log('注意：本工具仅用于个人学习研究，禁止商用');
  console.log('='.repeat(60));
  
  ensureDirs();
  
  const errors: CrawlError[] = loadErrorLog();
  const allGames: DpxqChessItem[] = [];
  
  try {
    const years = await fetchYearLinks();
    
    for (const year of years) {
      console.log(`\n=== 开始爬取 ${year} 年棋谱 ===`);
      
      const months = await fetchMonthLinks(year);
      const yearGames: DpxqChessItem[] = [];
      
      for (const month of months) {
        console.log(`  处理 ${month}...`);
        
        const dates = await fetchDateLinks(year, month);
        
        for (const date of dates) {
          console.log(`    处理 ${date}...`);
          
          const gameList = await fetchGameIds(year, month, date);
          console.log(`      ${date} 有 ${gameList.length} 局棋谱`);
          
          for (const gameItem of gameList) {
            console.log(`        获取棋谱 ${gameItem.id}...`);
            
            try {
              const game = await fetchGameDetail(gameItem);
              if (game) {
                yearGames.push(game);
                console.log(`          ✓ ${game.redPlayer} vs ${game.blackPlayer}`);
              } else {
                errors.push({
                  url: `${SEARCH_URL}/view.asp?owner=m&id=${gameItem.id}`,
                  error: '棋谱数据不完整',
                  timestamp: Date.now(),
                });
              }
              
              await delay(1000, 1800);
            } catch (error) {
              console.warn(`          ✗ 获取失败: ${error}`);
              errors.push({
                url: `${SEARCH_URL}/view.asp?owner=m&id=${gameItem.id}`,
                error: String(error),
                timestamp: Date.now(),
              });
            }
          }
        }
      }
      
      if (yearGames.length > 0) {
        saveYearData(year, yearGames);
        allGames.push(...yearGames);
      }
    }
    
    console.log('\n=== 构建全局索引 ===');
    const index = buildFullIndex(allGames);
    fs.writeFileSync(
      path.join(DATA_DIR, 'full_index.json'),
      JSON.stringify(index, null, 2),
      'utf-8'
    );
    
    if (errors.length > 0) {
      saveErrorLog(errors);
      console.log(`\n⚠️  有 ${errors.length} 个棋谱爬取失败，已记录到 errorLog.json`);
    }
    
    console.log('\n'.repeat(2));
    console.log('='.repeat(60));
    console.log('爬取完成！');
    console.log(`总棋谱数: ${allGames.length}`);
    console.log(`失败数: ${errors.length}`);
    console.log(`数据目录: ${DATA_DIR}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n爬取过程发生错误:', error);
    saveErrorLog(errors);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { main, fetchGameDetail, parseMovesFromMovelist, fetchGameIds };
