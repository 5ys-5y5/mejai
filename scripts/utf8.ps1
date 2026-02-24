# One-time UTF-8 console fix for this PowerShell session.
chcp 65001 | Out-Null
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Write-Host "PowerShell encoding set to UTF-8 for this session."
