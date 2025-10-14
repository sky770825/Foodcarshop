@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    🔧 推送修正到 GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo 📝 準備提交修正...
echo.

git add index.html vite.config.ts

echo.
echo 📋 提交訊息：🔧 修正 Vercel 部署問題
echo.

git commit -m "🔧 修正 Vercel 部署問題：index.html 路徑 + vite.config.ts ESM 支援"

echo.
echo 🚀 推送到 GitHub...
echo.

git push origin main

echo.
echo ========================================
echo    ✅ 推送完成！
echo.
echo    ⏳ Vercel 會自動重新部署
echo    📊 前往查看：
echo    https://vercel.com/dashboard
echo ========================================
echo.

pause

