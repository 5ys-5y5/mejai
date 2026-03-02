param(
  [Parameter(Mandatory = $true)]
  [string]$TranscriptPath,
  [Parameter(Mandatory = $true)]
  [string]$ReadyRegex,
  [Parameter(Mandatory = $true)]
  [int]$ThrottleMs,
  [Parameter(Mandatory = $true)]
  [string]$Message
)

$lastNotifyAt = Get-Date '1970-01-01'
$regex = [regex]::new($ReadyRegex, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
function Normalize-Line([string]$line) {
  if (-not $line) { return '' }
  $clean = $line -replace "`e\\[[0-9;]*[A-Za-z]", ""
  $clean = $clean -replace "`e\\][^\a]*\a", ""
  return $clean.TrimEnd()
}

function Show-Notify([string]$msg) {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [System.Media.SystemSounds]::Asterisk.Play()
    $icon = New-Object System.Windows.Forms.NotifyIcon
    $icon.Icon = [System.Drawing.SystemIcons]::Information
    $icon.Visible = $true
    $icon.BalloonTipTitle = 'Codex'
    $icon.BalloonTipText = $msg
    $icon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
    $icon.ShowBalloonTip(3000)
    Start-Sleep -Milliseconds 3500
    $icon.Dispose()
  } catch {
    try {
      [System.Media.SystemSounds]::Asterisk.Play()
    } catch {}
  }
}

if (-not (Test-Path $TranscriptPath)) {
  exit 0
}

Get-Content -Path $TranscriptPath -Wait | ForEach-Object {
  $line = Normalize-Line $_
  if (-not $line) { return }
  if ($regex.IsMatch($line)) {
    $now = Get-Date
    if (($now - $lastNotifyAt).TotalMilliseconds -ge $ThrottleMs) {
      $lastNotifyAt = $now
      Show-Notify $Message
    }
  }
}
