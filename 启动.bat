@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动象棋棋谱工具...
echo.
npm run dev
pause
