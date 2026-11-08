@echo off
title AMPLIA -- Motor Local IA (Um Cara Caramelo LAB)
color 06

echo ========================================================
echo   AMPLIA -- Estudio de Super-Resolucao e IA Local
echo   LAB / 20 -- Um Cara Caramelo (Laboratorio de Interacao)
echo ========================================================
echo.

cd /d "%~dp0\engine"

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Python 3 nao foi encontrado no seu PATH.
    echo Por favor, instale o Python 3.10 ou superior para executar os modelos pesados.
    pause
    exit /b 1
)

echo [1/2] Verificando dependencias essenciais...
pip install -r requirements.txt --quiet

echo.
echo [2/2] Iniciando Servidor Local em http://127.0.0.1:18790...
echo Modelos suportados: Real-ESRGAN, GFPGAN v1.4, BiRefNet, LaMa, MDX-Net, FFmpeg.
echo.
python app.py

pause
