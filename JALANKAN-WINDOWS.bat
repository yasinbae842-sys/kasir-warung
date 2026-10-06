@echo off
title Kasir Warung
cd /d "%~dp0"
echo Kasir Warung berjalan di http://localhost:8080
echo Biarkan jendela ini terbuka. Tutup jendela ini untuk menghentikan.
start "" http://localhost:8080
py -m http.server 8080 2>nul || python -m http.server 8080 2>nul || npx --yes serve -l 8080
pause
