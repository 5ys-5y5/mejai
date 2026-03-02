chcp 65001 > $null
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

$Args = $args

function Load-EnvFile([string]$path) {
  if (-not (Test-Path $path)) { return }
  Get-Content -Path $path | ForEach-Object {
    $line = $_
    if (-not $line) { return }
    $trimmed = $line.Trim()
    if ($trimmed.StartsWith('#')) { return }
    $parts = $trimmed -split '=', 2
    if ($parts.Length -ne 2) { return }
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Trim("'") }
    if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Trim('"') }
    if ($key) { Set-Item -Path ("Env:" + $key) -Value $value }
  }
}

Load-EnvFile (Join-Path $PSScriptRoot '..\.env')

$readyRegex = if ($env:CODEX_READY_REGEX) { $env:CODEX_READY_REGEX } else { '^(you|user)\s*:|^>\s*$' }
$throttleMs = if ($env:CODEX_NOTIFY_THROTTLE_MS) { [int]$env:CODEX_NOTIFY_THROTTLE_MS } else { 4000 }
$notifyMessage = if ($env:CODEX_NOTIFY_MESSAGE) { $env:CODEX_NOTIFY_MESSAGE } else { 'Codex is ready for your reply.' }
$inlineFlag = $env:CODEX_NOTIFY_INLINE -eq '1'

$transcriptPath = Join-Path $env:TEMP ("codex-transcript-$PID.log")

try {
  Start-Transcript -Path $transcriptPath -Append | Out-Null
} catch {
  $transcriptPath = ''
}

$watcher = $null
if ($transcriptPath) {
  $watcherArgs = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $PSScriptRoot 'codex-notify-watch.ps1'),
    '-TranscriptPath', $transcriptPath,
    '-ReadyRegex', $readyRegex,
    '-ThrottleMs', $throttleMs,
    '-Message', $notifyMessage
  )
  try {
    $watcher = Start-Process -FilePath 'powershell' -ArgumentList $watcherArgs -WindowStyle Hidden -PassThru
  } catch {
    $watcher = $null
  }
}

try {
  $codexArgs = @()
  if ($inlineFlag) { $codexArgs += '--no-alt-screen' }
  if ($Args) { $codexArgs += $Args }
  & codex @codexArgs
} finally {
  if ($transcriptPath) {
    try { Stop-Transcript | Out-Null } catch {}
  }
  if ($watcher -and !$watcher.HasExited) {
    try { Stop-Process -Id $watcher.Id -Force } catch {}
  }
}
