@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set TERM=dumb
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\codex-notify.ps1" %*
