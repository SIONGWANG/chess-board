import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as iconv from 'iconv-lite';

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

interface ProgressData {
  completedYears: number[];
  completedDates: Set<string>;
  completedGameIds: Set<string>;
  lastRunTimestamp: number;
}

interface CrawlOptions {
  yearStart: number;
  yearEnd: number;
  concurrency: number;
  delayMin: number;
  delayMax: number;
}

const DEFAULT_OPTIONS: CrawlOptions = {
  yearStart: 2000,
  yearEnd: 2026,
  concurrency: 1,
  delayMin: 1500,
  delayMax: 2500,
};

function parseArgs(): CrawlOptions {
  const options = { ...DEFAULT_OPTIONS };
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg.startsWith('--year-start=')) {
      options.yearStart = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--year-end=')) {
      options.yearEnd = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay-min=')) {
      options.delayMin = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay-max=')) {
      options.delayMax = parseInt(arg.split('=')[1], 10);
    }
  }
  
  return options;
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

async function fetchYearLinks(options: CrawlOptions): Promise<number[]> {
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
      if (year >= options.yearStart && year <= options.yearEnd) {
        years.push(year);
      }
    }
  });
  
  years.sort((a, b) => a - b);
  console.log(`获取到 ${years.length} 个年份 (${options.yearStart}-${options.yearEnd})`);
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
      await delay(500, 800);
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

function loadProgress(): ProgressData {
  const filePath = path.join(DATA_DIR, 'progress.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        completedYears: data.completedYears || [],
        completedDates: new Set(data.completedDates || []),
        completedGameIds: new Set(data.completedGameIds || []),
        lastRunTimestamp: data.lastRunTimestamp || 0,
      };
    } catch {
      return {
        completedYears: [],
        completedDates: new Set(),
        completedGameIds: new Set(),
        lastRunTimestamp: 0,
      };
    }
  }
  return {
    completedYears: [],
    completedDates: new Set(),
    completedGameIds: new Set(),
    lastRunTimestamp: 0,
  };
}

function saveProgress(progress: ProgressData): void {
  const filePath = path.join(DATA_DIR, 'progress.json');
  fs.writeFileSync(filePath, JSON.stringify({
    completedYears: progress.completedYears,
    completedDates: Array.from(progress.completedDates),
    completedGameIds: Array.from(progress.completedGameIds),
    lastRunTimestamp: Date.now(),
  }, null, 2), 'utf-8');
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
  
  let existingItems: DpxqChessItem[] = [];
  if (fs.existsSync(filePath)) {
    try {
      existingItems = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      existingItems = [];
    }
  }
  
  const itemMap = new Map<string, DpxqChessItem>();
  existingItems.forEach(item => itemMap.set(item.id, item));
  items.forEach(item => itemMap.set(item.id, item));
  
  const allItems = Array.from(itemMap.values());
  fs.writeFileSync(filePath, JSON.stringify(allItems, null, 2), 'utf-8');
  
  for (const item of items) {
    const xqfPath = path.join(XQF_DIR, `${item.id}.xqf`);
    if (!fs.existsSync(xqfPath)) {
      const xqfContent = generateXQF(item);
      fs.writeFileSync(xqfPath, xqfContent, 'utf-8');
    }
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

class ConcurrentPool<T> {
  private concurrency: number;
  private running: number = 0;
  private queue: (() => Promise<T>)[] = [];
  private results: T[] = [];
  private errors: Error[] = [];
  
  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }
  
  async add(task: () => Promise<T>): Promise<void> {
    this.queue.push(task);
    await this.process();
  }
  
  private async process(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.running++;
      
      try {
        const result = await task();
        this.results.push(result);
      } catch (error) {
        this.errors.push(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.running--;
        await this.process();
      }
    }
  }
  
  async wait(): Promise<T[]> {
    while (this.running > 0 || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.results;
  }
  
  getErrors(): Error[] {
    return this.errors;
  }
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天${hours % 24}小时${minutes % 60}分`;
  } else if (hours > 0) {
    return `${hours}小时${minutes % 60}分${seconds % 60}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  
  console.log('='.repeat(60));
  console.log('东萍象棋网棋谱爬虫工具');
  console.log('='.repeat(60));
  console.log(`配置参数:`);
  console.log(`  年份范围: ${options.yearStart} - ${options.yearEnd}`);
  console.log(`  并发数: ${options.concurrency}`);
  console.log(`  请求间隔: ${options.delayMin}-${options.delayMax}ms`);
  console.log('='.repeat(60));
  console.log('注意：本工具仅用于个人学习研究，禁止商用');
  console.log('='.repeat(60));
  
  ensureDirs();
  
  const progress = loadProgress();
  const errors: CrawlError[] = loadErrorLog();
  const allGames: DpxqChessItem[] = [];
  
  const startTime = Date.now();
  let totalGamesCount = 0;
  let completedGamesCount = 0;
  
  if (progress.completedYears.length > 0) {
    console.log(`\n发现上次爬取进度，已完成 ${progress.completedYears.length} 个年份，${progress.completedDates.size} 个日期，${progress.completedGameIds.size} 个棋谱`);
    console.log('将从上次中断处继续爬取...');
  }
  
  try {
    const years = await fetchYearLinks(options);
    
    const filteredYears = years.filter(year => !progress.completedYears.includes(year));
    console.log(`\n需要爬取的年份: ${filteredYears.join(', ')}`);
    
    for (const year of filteredYears) {
      console.log(`\n=== 开始爬取 ${year} 年棋谱 ===`);
      
      const months = await fetchMonthLinks(year);
      const yearGames: DpxqChessItem[] = [];
      
      for (const month of months) {
        console.log(`  处理 ${month}...`);
        
        const dates = await fetchDateLinks(year, month);
        const filteredDates = dates.filter(date => !progress.completedDates.has(date));
        
        if (filteredDates.length === 0) {
          console.log(`    ${month} 的所有日期已爬取完成，跳过`);
          continue;
        }
        
        for (const date of filteredDates) {
          console.log(`    处理 ${date}...`);
          
          const gameList = await fetchGameIds(year, month, date);
          const filteredGameList = gameList.filter(game => !progress.completedGameIds.has(game.id));
          
          console.log(`      ${date} 有 ${gameList.length} 局棋谱，跳过 ${gameList.length - filteredGameList.length} 个已完成，待爬 ${filteredGameList.length} 个`);
          
          totalGamesCount += filteredGameList.length;
          
          const pool = new ConcurrentPool<DpxqChessItem | null>(options.concurrency);
          
          for (const gameItem of filteredGameList) {
            pool.add(async () => {
              await delay(options.delayMin, options.delayMax);
              const game = await fetchGameDetail(gameItem);
              completedGamesCount++;
              
              const elapsed = Date.now() - startTime;
              const avgTimePerGame = completedGamesCount > 0 ? elapsed / completedGamesCount : 0;
              const remainingGames = totalGamesCount - completedGamesCount;
              const estimatedRemaining = avgTimePerGame * remainingGames;
              
              const progressPercent = totalGamesCount > 0 
                ? ((completedGamesCount / totalGamesCount) * 100).toFixed(1) 
                : '0.0';
              
              process.stdout.write(`\r      进度: ${completedGamesCount}/${totalGamesCount} (${progressPercent}%) | 预计剩余: ${formatTime(estimatedRemaining)}`);
              
              if (game) {
                yearGames.push(game);
                progress.completedGameIds.add(game.id);
              } else {
                errors.push({
                  url: `${SEARCH_URL}/view.asp?owner=m&id=${gameItem.id}`,
                  error: '棋谱数据不完整',
                  timestamp: Date.now(),
                });
              }
              
              return game;
            });
          }
          
          await pool.wait();
          progress.completedDates.add(date);
          saveProgress(progress);
          
          console.log('');
        }
      }
      
      if (yearGames.length > 0) {
        saveYearData(year, yearGames);
        allGames.push(...yearGames);
      }
      
      progress.completedYears.push(year);
      saveProgress(progress);
      
      console.log(`  ${year} 年爬取完成，共 ${yearGames.length} 局`);
    }
    
    if (filteredYears.length === 0) {
      console.log('\n所有年份已爬取完成！');
    }
    
    console.log('\n=== 构建全局索引 ===');
    
    const existingIndexPath = path.join(DATA_DIR, 'full_index.json');
    let existingIndex: ChessIndexItem[] = [];
    if (fs.existsSync(existingIndexPath)) {
      try {
        existingIndex = JSON.parse(fs.readFileSync(existingIndexPath, 'utf-8'));
      } catch {
        existingIndex = [];
      }
    }
    
    const newIndex = buildFullIndex(allGames);
    const indexMap = new Map<string, ChessIndexItem>();
    existingIndex.forEach(item => indexMap.set(item.id, item));
    newIndex.forEach(item => indexMap.set(item.id, item));
    
    const finalIndex = Array.from(indexMap.values());
    fs.writeFileSync(
      existingIndexPath,
      JSON.stringify(finalIndex, null, 2),
      'utf-8'
    );
    
    if (errors.length > 0) {
      saveErrorLog(errors);
      console.log(`\n⚠️  有 ${errors.length} 个棋谱爬取失败，已记录到 errorLog.json`);
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n'.repeat(2));
    console.log('='.repeat(60));
    console.log('爬取完成！');
    console.log(`总棋谱数: ${allGames.length}`);
    console.log(`失败数: ${errors.length}`);
    console.log(`总耗时: ${formatTime(totalTime)}`);
    console.log(`数据目录: ${DATA_DIR}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n爬取过程发生错误:', error);
    saveErrorLog(errors);
    saveProgress(progress);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { main, fetchGameDetail, parseMovesFromMovelist, fetchGameIds };