#!/bin/sh
# Jalankan server lokal untuk Kasir Warung
cd "$(dirname "$0")" || exit 1
echo "Kasir Warung berjalan di http://localhost:8080 (tekan Ctrl+C untuk berhenti)"
(sleep 1; (open http://localhost:8080 || xdg-open http://localhost:8080) >/dev/null 2>&1) &
if command -v python3 >/dev/null 2>&1; then python3 -m http.server 8080
else npx --yes serve -l 8080; fi
