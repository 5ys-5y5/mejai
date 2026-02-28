# solveEncodingErr.ps1
# Find and fix garbled Hangul caused by UTF-8/CP949 mis-decoding.
# Restores mojibake to Korean when possible.
$roots = @("C:\dev\mejai\src", "C:\dev\mejai\docs")
$exts = @(".ts",".tsx",".js",".jsx",".json",".md")
$skipDirs = @("node_modules",".next","dist","build","out","coverage",".git")
$utf8 = [System.Text.UTF8Encoding]::new($false)
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$cp949 = [System.Text.Encoding]::GetEncoding(949)
$cjk = [regex]"[\p{IsCJKUnifiedIdeographs}\p{IsCJKCompatibilityIdeographs}]"
$hangul = [regex]"[\p{IsHangulSyllables}]"

function Get-CharCounts([string]$text) {
  $cjkCount = $cjk.Matches($text).Count
  $hangulCount = $hangul.Matches($text).Count
  $replacement = [regex]::Matches($text, [char]0xFFFD).Count
  $question = [regex]::Matches($text, "\?").Count
  return @{ cjk = $cjkCount; hangul = $hangulCount; replacement = $replacement; question = $question }
}

function Score-Text([string]$text) {
  $c = Get-CharCounts $text
  # Higher is better: favor Hangul, penalize CJK, replacement, and '?' noise.
  return ($c.hangul * 5) - ($c.cjk * 3) - ($c.replacement * 10) - ($c.question * 2)
}

function Is-MojibakeCandidate([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return $false }
  $c = Get-CharCounts $text
  if ($c.replacement -gt 0) { return $true }
  if ($c.cjk -ge 2 -and $c.hangul -eq 0) { return $true }
  if ($c.question -ge 3 -and $c.hangul -eq 0) { return $true }
  return $false
}

$changed = 0

function Get-SourceFiles([string]$root) {
  $stack = New-Object System.Collections.Stack
  $stack.Push($root)
  while ($stack.Count -gt 0) {
    $current = $stack.Pop()
    $dirs = $null
    try { $dirs = [System.IO.Directory]::GetDirectories($current) } catch { $dirs = @() }
    foreach ($dir in $dirs) {
      $info = $null
      try { $info = [System.IO.DirectoryInfo]$dir } catch { $info = $null }
      if ($info -and ($info.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { continue }
      $name = [System.IO.Path]::GetFileName($dir)
      if ($skipDirs -contains $name) { continue }
      $stack.Push($dir)
    }
    $files = $null
    try { $files = [System.IO.Directory]::GetFiles($current) } catch { $files = @() }
    foreach ($file in $files) {
      $ext = [System.IO.Path]::GetExtension($file)
      if ($exts -contains $ext) { $file }
    }
  }
}

$allFiles = @()
foreach ($root in $roots) {
  if (Test-Path $root) {
    $allFiles += Get-SourceFiles $root
  }
}

$processed = 0
$allFiles | ForEach-Object {
  $path = $_
  $processed++
  if (($processed % 50) -eq 0) {
    Write-Host ("processing=" + $processed)
  }
  $bytes = $null
  try { $bytes = [System.IO.File]::ReadAllBytes($path) } catch { return }

  $text = $null
  $utf8Valid = $true
  try {
    $text = $utf8Strict.GetString($bytes)
  } catch {
    $utf8Valid = $false
  }

  # If UTF-8 is invalid, decode as CP949 and write UTF-8.
  if (-not $utf8Valid) {
    $fixedAll = $cp949.GetString($bytes)
    [System.IO.File]::WriteAllText($path, $fixedAll, $utf8)
    $changed++
    return
  }

  $counts = Get-CharCounts $text
  $updated = $false

  # If the whole file looks garbled (many CJK or many '?' and almost no Hangul), fix entire file at once.
  if ((($counts.cjk -ge 10) -or ($counts.question -ge 10) -or ($counts.replacement -gt 0)) -and ($counts.hangul -eq 0 -or $counts.hangul * 3 -lt $counts.cjk)) {
    $fixedAll = $utf8.GetString($cp949.GetBytes($text))
    if ($fixedAll -ne $text -and (Score-Text $fixedAll) -gt (Score-Text $text)) {
      $text = $fixedAll
      $updated = $true
    }
  } else {
    $lines = $text -split "`n", -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
      $line = [string]$lines[$i]
      if (-not (Is-MojibakeCandidate $line)) { continue }
      $candidate = $utf8.GetString($cp949.GetBytes($line))
      if ($candidate -ne $line -and (Score-Text $candidate) -gt (Score-Text $line)) {
        $lines[$i] = $candidate
        $updated = $true
      }
    }
    if ($updated) {
      $text = ($lines -join "`n")
    }
  }

  if ($updated) {
    [System.IO.File]::WriteAllText($path, $text, $utf8)
    $changed++
    return
  }

}

"files_fixed=$changed"
