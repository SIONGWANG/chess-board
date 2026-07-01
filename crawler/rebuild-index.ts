import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../chess_data');
const RAW_DIR = path.join(DATA_DIR, 'raw');

interface ChessIndexItem {
  id: string;
  year: number;
  event: string;
  redPlayer: string;
  blackPlayer: string;
  title: string;
  result: string;
}

interface DpxqChessItem {
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

function buildIndexFromRaw(): ChessIndexItem[] {
  const allGames: ChessIndexItem[] = [];
  
  if (!fs.existsSync(RAW_DIR)) {
    console.log('raw 目录不存在');
    return [];
  }
  
  const files = fs.readdirSync(RAW_DIR);
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const filePath = path.join(RAW_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const games: DpxqChessItem[] = JSON.parse(content);
      
      for (const game of games) {
        allGames.push({
          id: game.id,
          year: game.year,
          event: game.event,
          redPlayer: game.redPlayer,
          blackPlayer: game.blackPlayer,
          title: game.title,
          result: game.result,
        });
      }
      
      console.log(`  读取 ${file}: ${games.length} 局棋谱`);
    } catch (err) {
      console.warn(`  读取 ${file} 失败: ${err}`);
    }
  }
  
  return allGames;
}

async function main() {
  console.log('='.repeat(60));
  console.log('重新构建棋谱索引');
  console.log('='.repeat(60));
  
  const index = buildIndexFromRaw();
  
  if (index.length === 0) {
    console.log('\n没有找到棋谱数据，请先运行爬虫');
    process.exit(0);
  }
  
  const indexPath = path.join(DATA_DIR, 'full_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  
  console.log(`\n索引构建完成！`);
  console.log(`总棋谱数: ${index.length}`);
  console.log(`索引文件: ${indexPath}`);
  console.log('='.repeat(60));
}

main();