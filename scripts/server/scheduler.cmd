@echo off
rem Agendador do Ministre: lembretes automaticos, resumo semanal e envio dos avisos para o celular.
rem Tarefa do Windows "Ministre Agendador" (SYSTEM, a cada 1 minuto).
set OPENSSL_CONF=C:\php83\extras\ssl\openssl.cnf
cd /d "%~dp0..\..\apps\api"
C:\php83\php.exe artisan schedule:run >nul 2>&1
