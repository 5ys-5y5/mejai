# MCP 테스트 가이드 (PowerShell)

## 사전 준비
- Supabase 로그인으로 얻은 access token
- MCP 스키마/시드 적용 완료

## 실행 방법
```powershell
$env:MCP_BASE_URL="http://localhost:3000"
$env:MCP_TOKEN="<YOUR_SUPABASE_ACCESS_TOKEN>"
$env:MCP_SESSION_ID="<OPTIONAL_SESSION_ID>"

./scripts/mcp_test.ps1
```

## 토큰/세션 ID 획득 스크립트
```powershell
$env:MCP_EMAIL="user@mejai.help"
$env:MCP_PASSWORD="your_password"
$env:MCP_BASE_URL="http://localhost:3000"

./scripts/mcp_get_token_and_session.ps1
```

## 기대 결과
- `/api/mcp/tools` : 허용된 Tool 목록 반환
- `/api/mcp/tools/call` : `lookup_order` 샘플 호출 결과 반환
