@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set TERM=dumb
powershell -NoProfile -ExecutionPolicy Bypass -Command "chcp 65001 > $null; [Console]::InputEncoding=[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $OutputEncoding=[Console]::OutputEncoding; $PSDefaultParameterValues['*:Encoding']='utf8'; codex %*"
