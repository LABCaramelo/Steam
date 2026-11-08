@echo off
title PELICULA Engine - Motor Local de Cinema IA (LAB)
color 0E

echo ================================================================
echo   PELICULA - Motor Local de Cinema IA & Workflows
echo   LAB - Um Cara Caramelo (Porta 18795)
echo ================================================================
echo.

cd /d "%~dp0engine"

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Python nao foi encontrado no PATH do sistema.
    echo Instale o Python 3.10+ para executar o motor local.
    pause
    exit /b 1
)

if not exist ".venv" (
    echo [*] Criando ambiente virtual isolado (.venv)...
    python -m venv .venv
)

echo [*] Ativando ambiente virtual...
call .venv\Scripts\activate.bat

echo [*] Verificando dependencias...
pip install -r requirements.txt --quiet

echo.
echo [*] Iniciando servidor do motor local Pelicula...
echo [*] Acessivel em: http://127.0.0.1:18795
echo.

python app.py

pause
