import { useState } from 'react';
import { Terminal, Download, FileText, Upload, AlertCircle, Info, CheckCircle } from 'lucide-react';

export default function CrawlerTool() {
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportConfig = () => {
    const config = {
      baseUrl: 'http://www.dpxq.com',
      years: { min: 2000, max: 2026 },
      delay: { min: 1300, max: 2200 },
      outputDir: './chess_data',
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crawl_config.json';
    a.click();
    URL.revokeObjectURL(url);
    
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleOpenLogs = () => {
    window.open('/chess_data/errorLog.json', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900">
      <header className="bg-stone-900/80 backdrop-blur-sm border-b border-stone-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-700 rounded-lg flex items-center justify-center">
              <Terminal className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-400">爬虫工具</h1>
              <p className="text-sm text-stone-400 mt-0.5">东萍象棋网棋谱爬取操作面板</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-stone-800/60 rounded-xl border border-stone-700 p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-amber-400 mb-2">浏览器跨域限制说明</h2>
              <p className="text-stone-300 text-sm leading-relaxed">
                由于浏览器的跨域安全策略（CORS），前端无法直接向第三方网站发起HTTP请求。
                因此，棋谱爬取功能需要通过独立的Node.js脚本在本地运行。
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <button
            onClick={() => navigator.clipboard.writeText('npm run crawl')}
            className="group bg-stone-800/60 border border-stone-700 rounded-xl p-6 hover:border-amber-500/50 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 bg-amber-700/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-700/30 transition-colors">
              <Terminal className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-stone-200 mb-2">运行爬虫</h3>
            <p className="text-stone-400 text-sm mb-4">执行爬取脚本获取棋谱数据</p>
            <code className="block px-3 py-2 bg-stone-900 rounded-lg text-amber-400 text-sm font-mono">
              npm run crawl
            </code>
          </button>

          <button
            onClick={handleExportConfig}
            className="group bg-stone-800/60 border border-stone-700 rounded-xl p-6 hover:border-amber-500/50 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 bg-blue-700/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-700/30 transition-colors">
              <Download className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-200 mb-2">导出配置</h3>
            <p className="text-stone-400 text-sm mb-4">下载当前爬虫配置文件</p>
            {exportSuccess && (
              <span className="inline-flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle size={16} />
                已复制配置
              </span>
            )}
          </button>

          <button
            onClick={handleOpenLogs}
            className="group bg-stone-800/60 border border-stone-700 rounded-xl p-6 hover:border-amber-500/50 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 bg-red-700/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-700/30 transition-colors">
              <FileText className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-200 mb-2">查看错误日志</h3>
            <p className="text-stone-400 text-sm mb-4">查看爬取失败的棋谱清单</p>
            <span className="text-xs text-stone-500">errorLog.json</span>
          </button>
        </div>

        <div className="bg-stone-800/60 rounded-xl border border-stone-700 p-6">
          <h2 className="text-lg font-bold text-stone-200 mb-4">爬取步骤</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">1</div>
              <div>
                <h3 className="font-medium text-stone-200">打开命令行</h3>
                <p className="text-stone-400 text-sm">在项目根目录打开终端（PowerShell 或 CMD）</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
              <div>
                <h3 className="font-medium text-stone-200">安装依赖</h3>
                <p className="text-stone-400 text-sm">首次运行需安装爬虫依赖</p>
                <code className="inline-block px-2 py-1 bg-stone-900 rounded text-amber-400 text-xs font-mono">npm install</code>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
              <div>
                <h3 className="font-medium text-stone-200">执行爬取</h3>
                <p className="text-stone-400 text-sm">运行爬虫脚本开始下载棋谱数据</p>
                <code className="inline-block px-2 py-1 bg-stone-900 rounded text-amber-400 text-xs font-mono">npm run crawl</code>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">4</div>
              <div>
                <h3 className="font-medium text-stone-200">查看结果</h3>
                <p className="text-stone-400 text-sm">爬取完成后，数据保存在 chess_data/ 目录下</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-stone-800/60 rounded-xl border border-stone-700 p-6">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-stone-200 mb-2">数据结构说明</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-stone-900/50 rounded-lg p-4">
                  <h4 className="text-amber-400 font-medium text-sm mb-2">chess_data/</h4>
                  <ul className="text-stone-400 text-xs space-y-1">
                    <li>├─ full_index.json - 全局索引（棋谱库页面读取）</li>
                    <li>├─ errorLog.json - 错误日志</li>
                    <li>├─ raw/ - 按年份拆分的棋谱JSON</li>
                    <li>└─ xqf/ - 标准XQF格式棋谱文件</li>
                  </ul>
                </div>
                <div className="bg-stone-900/50 rounded-lg p-4">
                  <h4 className="text-amber-400 font-medium text-sm mb-2">爬取策略</h4>
                  <ul className="text-stone-400 text-xs space-y-1">
                    <li>✓ 模拟Chrome浏览器请求头</li>
                    <li>✓ 单线程串行请求，避免封禁</li>
                    <li>✓ 每次请求间隔1300-2200ms</li>
                    <li>✓ 自动重试失败链接</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-red-900/20 border border-red-700/50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-red-400 mb-2">合规提示</h2>
              <p className="text-stone-300 text-sm leading-relaxed">
                本爬虫工具仅用于个人学习研究目的。请遵守网站robots.txt规则和相关法律法规，
                禁止爬取网站付费VIP内容，禁止用于商业用途。爬取频率已做严格限制，请勿修改延迟参数。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <ChessFileUpload />
        </div>
      </main>
    </div>
  );
}

function ChessFileUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setError('');
    setSuccess('');

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (!['json', 'xqf'].includes(ext || '')) {
        setError(`不支持的文件格式: ${file.name}`);
        continue;
      }

      try {
        const text = await file.text();
        
        if (ext === 'json') {
          const jsonData = JSON.parse(text);
          const cacheKey = `chess_local_cache_${Date.now()}`;
          const cache: Record<string, unknown> = JSON.parse(
            localStorage.getItem('chess_local_cache') || '{}'
          );
          cache[cacheKey] = jsonData;
          localStorage.setItem('chess_local_cache', JSON.stringify(cache));
          setSuccess(`✓ 成功导入 ${file.name}`);
        } else {
          const cacheKey = `chess_local_cache_${Date.now()}`;
          const cache: Record<string, unknown> = JSON.parse(
            localStorage.getItem('chess_local_cache') || '{}'
          );
          cache[cacheKey] = { type: 'xqf', content: text };
          localStorage.setItem('chess_local_cache', JSON.stringify(cache));
          setSuccess(`✓ 成功导入 ${file.name}`);
        }
      } catch (err) {
        setError(`导入失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  return (
    <div className="bg-stone-800/60 rounded-xl border border-stone-700 p-6">
      <h2 className="text-lg font-bold text-stone-200 mb-4">导入本地棋谱文件</h2>
      
      <div
        className="border-2 border-dashed border-stone-600 rounded-xl p-8 text-center hover:border-amber-500 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".json,.xqf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-16 h-16 mx-auto mb-4 bg-stone-700/50 rounded-xl flex items-center justify-center">
          <Upload className="w-8 h-8 text-amber-500" />
        </div>
        <p className="text-stone-300 font-medium mb-2">拖拽文件到此处或点击选择</p>
        <p className="text-stone-500 text-sm">支持 .json 和 .xqf 格式</p>
      </div>

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}
      {success && (
        <p className="mt-4 text-green-400 text-sm">{success}</p>
      )}
    </div>
  );
}