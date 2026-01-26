param(
  [string]$BaseUrl = $env:MCP_BASE_URL,
  [string]$Token = $env:MCP_TOKEN,
  [string]$SessionId = $env:MCP_SESSION_ID
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
if (-not $BaseUrl -and $envMap.ContainsKey("MCP_BASE_URL")) {
  $BaseUrl = $envMap["MCP_BASE_URL"]
}
if (-not $Token -and $envMap.ContainsKey("MCP_TOKEN")) {
  $Token = $envMap["MCP_TOKEN"]
}
if (-not $SessionId -and $envMap.ContainsKey("MCP_SESSION_ID")) {
  $SessionId = $envMap["MCP_SESSION_ID"]
}

if (-not $BaseUrl) {
  throw "MCP_BASE_URL is required (e.g., http://localhost:3000)"
}

if (-not $Token) {
  throw "MCP_TOKEN is required (Supabase access token or Bearer token)"
}

$headers = @{
  Authorization = if ($Token.StartsWith("Bearer ")) { $Token } else { "Bearer $Token" }
  "Content-Type" = "application/json"
}

Write-Host "== MCP Tools List =="
$tools = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/mcp/tools" -Headers $headers
$tools | ConvertTo-Json -Depth 6

Write-Host ""
Write-Host "== MCP Tool Call (lookup_order) =="
$body = @{
  tool = "lookup_order"
  params = @{
    order_id = "A-1001"
    customer_verification_token = "cvt_001"
  }
  session_id = $SessionId
} | ConvertTo-Json -Depth 6

try {
  $call = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/mcp/tools/call" -Headers $headers -Body $body
  $call | ConvertTo-Json -Depth 6
} catch {
  Write-Host "MCP tool call failed."
  if ($_.Exception -and $_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $content = $reader.ReadToEnd()
    $reader.Close()
    Write-Host $content
  } else {
    Write-Host $_
  }
}
