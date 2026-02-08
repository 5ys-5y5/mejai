# Runtime Repro Checklist

## Scenario: `배송지 변경 -> 전화번호 -> OTP`

### Preconditions
- Intent: `order_change`
- Phone-based order lookup policy enabled
- OTP tools allowed: `send_otp`, `verify_otp`
- Order tools allowed: `list_orders` (and optionally `lookup_order`)
- Principle baseline: `src/app/api/runtime/chat/policies/principles.ts`

### Step 1: User says `배송지 변경`
- Expected response:
  - Ask for order identifier or phone (for OTP + order lookup path)
- Expected events:
  - `SLOT_EXTRACTED`
  - `PRE_MCP_DECISION`
  - `FINAL_ANSWER_READY`
- Expected MCP:
  - No mandatory call yet

### Step 2: User provides phone number
- Expected response:
  - `문자로 전송된 인증번호를 입력해 주세요.`
- Expected events:
  - `SLOT_EXTRACTED`
  - `PRE_MCP_DECISION`
  - `FINAL_ANSWER_READY`
- Expected MCP:
  - `solapi:send_otp` success

### Step 3: User provides OTP
- Expected MCP order:
  - `solapi:verify_otp` success
  - `cafe24:list_orders` attempted

### Step 3-A: `list_orders` success with multiple orders
- Expected response:
  - Numbered order choices (order datetime/product/option/amount)
- Expected events:
  - `PRE_MCP_DECISION`
  - `ORDER_CHOICES_PRESENTED`
  - `FINAL_ANSWER_READY`

### Step 3-B: `list_orders` success with one order
- Expected response:
  - Auto-selected flow continues without re-asking phone
- Expected events:
  - `PRE_MCP_DECISION`
  - `ORDER_CHOICES_PRESENTED` (`auto_selected: true`)
  - Follow-up flow events

### Step 3-C: `list_orders` fails with scope error
- Error examples:
  - `SCOPE_ERROR`
- Expected response:
  - Explain missing scope and ask for admin reauthorization; allow manual order id
- Expected events:
  - `MCP_TOOL_FAILED`
  - `EXECUTION_GUARD_TRIGGERED` (`reason: MCP_SCOPE_MISSING`)
  - `FINAL_ANSWER_READY`

### Step 3-D: `list_orders` fails with token refresh error
- Error examples:
  - `TOKEN_REFRESH_FAILED`
  - `invalid_grant`
  - `Invalid refresh_token`
- Expected response:
  - Explain token refresh failure and ask for Cafe24 re-link; allow manual order id
- Expected events:
  - `MCP_TOOL_FAILED`
  - `EXECUTION_GUARD_TRIGGERED` (`reason: MCP_TOKEN_REFRESH_FAILED`)
  - `FINAL_ANSWER_READY`

### Principle checks (must pass)
- No-repeat principle:
  - If phone already known/verified in this flow, do not ask the same phone again by default.
- Reuse precedence:
  - `derived -> prevEntity -> prevTranscript -> recentEntity`
- Failure adjacency logging:
  - Failure point and immediate before/after signals must be present in audit events.

