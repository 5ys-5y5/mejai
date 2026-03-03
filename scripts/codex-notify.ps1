$ErrorActionPreference = 'Stop'

# Ensure UTF-8 (no BOM) for this session so Korean output won't get mangled.
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
try { chcp 65001 | Out-Null } catch {}

# Keep Python-based tools consistent too (harmless if unused).
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUTF8 = '1'
$env:PYTHONLEGACYWINDOWSSTDIO = '0'

# Find Codex CLI on PATH (codex.exe/codex.cmd/codex.ps1 all work via Get-Command).
$codexCmd = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codexCmd) {
  throw @"
`codex` 실행 파일을 찾지 못했습니다.
- 확인: 새 PowerShell에서 `codex --version` 이 동작하는지
- 또는 Cursor/설치된 Codex CLI가 다른 이름이면, 이 스크립트에서 호출 명령을 바꿔야 합니다.
"@
}

# Pass-through all arguments.
& $codexCmd.Source @args
exit $LASTEXITCODE

