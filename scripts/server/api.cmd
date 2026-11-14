@echo off
rem Liga a API do Ministre em 127.0.0.1:8000 (o Apache repassa api.ministreapp.com.br para ca).
rem Tarefa do Windows "Ministre API" (SYSTEM, ao ligar o servidor).
rem OPENSSL_CONF: o PHP no Windows precisa dele para assinar os avisos do celular (Web Push).
rem Fica so neste processo, sem mexer no resto da VPS.
set OPENSSL_CONF=C:\php83\extras\ssl\openssl.cnf
cd /d "%~dp0..\..\apps\api"
C:\php83\php.exe artisan serve --host=127.0.0.1 --port=8000 --no-reload
