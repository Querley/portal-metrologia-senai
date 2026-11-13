@echo off
cd /d "%~dp0"
set NODE_OPTIONS=--use-system-ca
if not exist "node_modules\@expo\cli" (
  echo Finalizando instalacao completa dos pacotes do Expo ^(aguarde terminar sem apertar Ctrl+C^)...
  call npm config set strict-ssl false
  call npm install --no-audit --no-fund
)
echo Iniciando o servidor Expo para o aplicativo Expo Go no celular...
call npx expo start
