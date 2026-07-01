import { useState, useRef, useCallback, useEffect } from 'react';
import ChessBoard from '@/components/ChessBoard';
import ControlBar from '@/components/ControlBar';
import MoveList from '@/components/MoveList';
import ChessFileUpload from '@/components/ChessFileUpload';
import {
  parseDhtmlXQ,
  getBoardAfterMoves,
  type ChessGame,
} from '@/utils/chessParser';
import html2canvas from 'html2canvas';
import { Upload, FileText, X, Camera } from 'lucide-react';

interface HomeProps {
  game?: ChessGame | null;
  onGameLoaded: (game: ChessGame) => void;
  onClearGame?: () => void;
}

const DEFAULT_PGN = `[DhtmlXQ]
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

export default function Home({ game: initialGame, onGameLoaded, onClearGame }: HomeProps) {
  const [game, setGame] = useState<ChessGame | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [showInput, setShowInput] = useState(false);
  const [pgnInput, setPgnInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [screenshotToast, setScreenshotToast] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialGame) {
      setGame(initialGame);
      setCurrentMoveIndex(-1);
      setBoard(initialGame.initialBoard);
    } else {
      const result = parseDhtmlXQ(DEFAULT_PGN);
      if (result.success && result.game) {
        setGame(result.game);
        setBoard(result.game.initialBoard);
      }
    }
  }, [initialGame]);

  useEffect(() => {
    if (game) {
      const newBoard = getBoardAfterMoves(game.initialBoard, game.moves, currentMoveIndex);
      setBoard(newBoard);
    }
  }, [currentMoveIndex, game]);

  const lastMove = game?.moves[currentMoveIndex] || null;

  const handleFirst = useCallback(() => {
    setCurrentMoveIndex(-1);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (game) {
      setCurrentMoveIndex((prev) => Math.min(game.moves.length - 1, prev + 1));
    }
  }, [game]);

  const handleLast = useCallback(() => {
    if (game) {
      setCurrentMoveIndex(game.moves.length - 1);
    }
  }, [game]);

  const handleMoveClick = useCallback((index: number) => {
    setCurrentMoveIndex(index);
  }, []);

  const handleScreenshot = useCallback(async () => {
    if (!boardRef.current) return;

    try {
      const canvas = await html2canvas(boardRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        try {
          window.focus();
          document.body.focus();
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setScreenshotToast('✓ 已复制到剪贴板');
          setTimeout(() => setScreenshotToast(''), 2000);
        } catch (err) {
          console.error('复制到剪贴板失败:', err);
          try {
            const dataUrl = canvas.toDataURL('image/png');
            const w = window.open('');
            if (w) {
              w.document.write(`<img src="${dataUrl}" style="max-width:100%" /><p style="text-align:center;font-family:sans-serif">右键图片 → 另存为 / 复制图片</p>`);
              setScreenshotToast('已打开图片，请右键保存');
              setTimeout(() => setScreenshotToast(''), 3000);
            } else {
              setScreenshotToast('复制失败，请检查浏览器权限');
              setTimeout(() => setScreenshotToast(''), 3000);
            }
          } catch (e2) {
            setScreenshotToast('截图失败，请重试');
            setTimeout(() => setScreenshotToast(''), 3000);
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('截图失败:', error);
      setScreenshotToast('截图失败，请重试');
      setTimeout(() => setScreenshotToast(''), 3000);
    }
  }, []);

  const handleParseInput = useCallback(() => {
    if (!pgnInput.trim()) {
      setParseError('请输入棋谱代码');
      return;
    }

    const result = parseDhtmlXQ(pgnInput);
    if (result.success && result.game) {
      setGame(result.game);
      setCurrentMoveIndex(-1);
      setShowInput(false);
      setPgnInput('');
      setParseError('');
    } else {
      setParseError(result.error || '棋谱解析失败，请检查DhtmlXQ格式是否正确');
    }
  }, [pgnInput]);

  const handleFileGameLoaded = useCallback((loadedGame: ChessGame) => {
    setGame(loadedGame);
    setCurrentMoveIndex(-1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900">
      <header className="bg-stone-900/80 backdrop-blur-sm border-b border-stone-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-700 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-400" style={{ fontFamily: 'KaiTi, STKaiti, SimKai, serif' }}>
                棋谱解析
              </h1>
              {game && game.title && (
                <p className="text-sm text-stone-400 mt-0.5">{game.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {initialGame && onClearGame && (
              <button
                onClick={onClearGame}
                className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors text-sm"
              >
                <X size={16} />
                <span>清除棋谱</span>
              </button>
            )}
            <ChessFileUpload onGameLoaded={handleFileGameLoaded} />
            <button
              onClick={() => { setShowInput(true); setParseError(''); setPgnInput(''); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Upload size={18} />
              <span className="text-sm font-medium">粘贴棋谱</span>
            </button>
          </div>
        </div>
      </header>

      {showInput && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-700">
            <div className="px-6 py-4 border-b border-stone-700 flex items-center justify-between bg-stone-800/50">
              <h2 className="text-lg font-bold text-amber-400" style={{ fontFamily: 'KaiTi, STKaiti, SimKai, serif' }}>
                导入棋谱
              </h2>
              <button
                onClick={() => setShowInput(false)}
                className="text-stone-400 hover:text-stone-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-400 mb-3">
                请粘贴 DhtmlXQ 格式的棋谱代码（以 [DhtmlXQ] 开头，以 [/DhtmlXQ] 结尾）
              </p>
              <textarea
                value={pgnInput}
                onChange={(e) => setPgnInput(e.target.value)}
                placeholder="[DhtmlXQ]
[DhtmlXQ_title]对局标题[/DhtmlXQ_title]
[DhtmlXQ_binit]...[/DhtmlXQ_binit]
[DhtmlXQ_movelist]...[/DhtmlXQ_movelist]
...
[/DhtmlXQ]"
                className="w-full h-64 p-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-300 font-mono text-sm resize-none focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
              {parseError && (
                <p className="mt-2 text-sm text-red-400">{parseError}</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-stone-700 flex justify-end gap-3 bg-stone-800/30">
              <button
                onClick={() => setShowInput(false)}
                className="px-5 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleParseInput}
                className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                解析棋谱
              </button>
            </div>
          </div>
        </div>
      )}

      {screenshotToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-stone-800/90 text-amber-400 rounded-xl shadow-lg border border-stone-700 text-sm font-medium">
          {screenshotToast}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {game ? (
          <div className="grid grid-cols-1 lg:grid-cols-[auto_320px] gap-8 items-start justify-center">
            <div className="flex flex-col items-center gap-6">
              <div className="w-full bg-stone-800/60 rounded-xl p-4 border border-stone-700">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 bg-red-600 rounded-full ring-2 ring-red-600/30"></span>
                    <div>
                      <span className="text-stone-200 font-medium">{game.red || '红方'}</span>
                      <span className="text-stone-500 text-xs ml-2">红先</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-400 font-bold text-lg" style={{ fontFamily: 'KaiTi, STKaiti, SimKai, serif' }}>
                      {game.result || '对局中'}
                    </div>
                    {game.title && (
                      <div className="text-stone-500 text-xs mt-1">{game.title}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-stone-200 font-medium">{game.black || '黑方'}</span>
                    </div>
                    <span className="w-3 h-3 bg-stone-700 rounded-full ring-2 ring-stone-700/30"></span>
                  </div>
                </div>
              </div>

              <div ref={boardRef} className="relative">
                <ChessBoard board={board} lastMove={lastMove} />
              </div>

              <div className="w-full max-w-xl">
                <ControlBar
                  onFirst={handleFirst}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onLast={handleLast}
                  onScreenshot={handleScreenshot}
                  currentMove={currentMoveIndex + 1}
                  totalMoves={game.moves.length}
                  disabled={!game}
                />
              </div>
            </div>

            <div className="h-[560px] w-full">
              <MoveList
                moves={game.moves}
                currentMoveIndex={currentMoveIndex}
                onMoveClick={handleMoveClick}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-stone-800 rounded-2xl flex items-center justify-center border border-stone-700">
                <FileText className="w-10 h-10 text-stone-600" />
              </div>
              <p className="text-stone-400 text-lg mb-2">暂无棋谱</p>
              <p className="text-stone-500 text-sm mb-6">点击右上角"粘贴棋谱"或"上传棋谱文件"导入</p>
              <button
                onClick={() => { setShowInput(true); setParseError(''); }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <Upload size={18} />
                <span className="font-medium">粘贴棋谱代码</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
