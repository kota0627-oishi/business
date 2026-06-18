@echo off
chcp 65001 > nul
cd /d "%~dp0"

python --version > nul 2>&1
if errorlevel 1 (
    echo [エラー] Python がインストールされていません。
    echo https://www.python.org/ からインストールしてください。
    pause
    exit
)

echo Amazon順位チェックサーバーを起動します...
echo ツールを使う前にこのウィンドウを起動してください。
echo.
python server.py
pause
