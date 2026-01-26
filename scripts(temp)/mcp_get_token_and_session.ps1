param(
  [string]$Email = $env:MCP_EMAIL,
  [string]$Password = $env:MCP_PASSWORD,
  [string]$AppBaseUrl = $env:MCP_BASE_URL,
  [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
  [string]$SupabaseAnonKey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
)

$ErrorActionPreference = "Stop"

function Load-DotEnv($Path) {
  if (-not (Test-Path $Path)) { return @{} }
  $map = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2) { return }
    $key = $parts[0].Trim()
    $val = $parts[1].Trim().Trim('"')
    $map[$key] = $val
  }
  return $map
}

$envMap = Load-DotEnv ".env"
if (-not $SupabaseUrl -and $envMap.ContainsKey("NEXT_PUBLIC_SUPABASE_URL")) {
  $SupabaseUrl = $envMap["NEXT_PUBLIC_SUPABASE_URL"]
}
if (-not $SupabaseAnonKey -and $envMap.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
  $SupabaseAnonKey = $envMap["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
}
if (-not $Email -and $envMap.ContainsKey("MCP_EMAIL")) {
  $Email = $envMap["MCP_EMAIL"]
}
if (-not $Password -and $envMap.ContainsKey("MCP_PASSWORD")) {
  $Password = $envMap["MCP_PASSWORD"]
}
if (-not $AppBaseUrl -and $envMap.ContainsKey("MCP_BASE_URL")) {
  $AppBaseUrl = $envMap["MCP_BASE_URL"]
}

if (-not $Email) { throw "MCP_EMAIL is required (Supabase user email)" }
if (-not $Password) { throw "MCP_PASSWORD is required (Supabase user password)" }
if (-not $SupabaseUrl) { throw "Supabase URL is required" }
if (-not $SupabaseAnonKey) { throw "Supabase anon key is required" }

$authUrl = "$SupabaseUrl/auth/v1/token?grant_type=password"
$headers = @{
  apikey = $SupabaseAnonKey
  "Content-Type" = "application/json"
}
$body = @{ email = $Email; password = $Password } | ConvertTo-Json

Write-Host "== Supabase Sign-In =="
$auth = Invoke-RestMethod -Method Post -Uri $authUrl -Headers $headers -Body $body
$token = $auth.access_token
if (-not $token) { throw "No access_token returned from Supabase" }

Write-Host ""
Write-Host "MCP_TOKEN=$token"

if ($AppBaseUrl) {
  Write-Host ""
  Write-Host "== Fetch org_id (optional) =="
  $appHeaders = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
  }
  $profile = Invoke-RestMethod -Method Get -Uri "$AppBaseUrl/api/user-profile" -Headers $appHeaders
  if ($profile -and $profile.org_id) {
    Write-Host "ORG_ID=$($profile.org_id)"
  } else {
    Write-Host "ORG_ID="
  }

  Write-Host ""
  Write-Host "== Fetch a session_id (optional) =="
  $sessions = Invoke-RestMethod -Method Get -Uri "$AppBaseUrl/api/sessions?limit=1&offset=0" -Headers $appHeaders
  $first = $sessions.items | Select-Object -First 1
  if ($first -and $first.id) {
    Write-Host "MCP_SESSION_ID=$($first.id)"
  } else {
    Write-Host "MCP_SESSION_ID="
  }
}
