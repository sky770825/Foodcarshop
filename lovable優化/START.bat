@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    🍗 極品鹽水雞訂購系統
echo    React + TypeScript 版本
echo ========================================
echo.
echo 📦 正在檢查依賴...
echo.

if not exist node_modules (
    echo ⚠️  未找到 node_modules，開始安裝依賴...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ❌ 安裝失敗！請檢查 Node.js 是否已安裝
        echo    下載地址: https://nodejs.org/
        pause
        exit /b 1
    )
    echo.
    echo ✅ 依賴安裝完成！
) else (
    echo ✅ 依賴已安裝
)

echo.
echo 🚀 正在啟動開發服務器...
echo.
echo    訪問地址: http://localhost:3000
echo    按 Ctrl+C 可停止服務器
echo.
echo ========================================
echo.

call npm run dev

pause

