@echo off
cd /d "%~dp0"
echo Abrindo o Simulador do App Mobile React Native no navegador...
start "" "http://localhost:3000/app-mobile"
npm run dev
