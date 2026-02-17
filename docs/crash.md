# Crash Notes: Policy Conflict (Force Tool vs Force Response)

This document explains the policy conflict path observed in shipping address change flows and the minimum audit evidence we must emit for deterministic debugging.

## Summary
When policy evaluation produces **both**:
- `force_tool_call`
- `force_response_template`
the runtime resolves the conflict in favor of **response templates**, which can bypass tool execution (OTP, list_orders, etc.).

This shows up as:
- `POLICY_STATIC_CONFLICT` (or `POLICY_CONFLICT_DETECTED`) with kind `FORCE_RESPONSE_VS_FORCE_TOOL`
- `resolution = tool_stage_force_response_precedence` (or `force_response_template_precedence`)

## Where It Happens
- Policy conflict detection: `src/app/api/runtime/chat/runtime/policyInputRuntime.ts`
- Conflict emission for tool stage: `src/app/api/runtime/chat/runtime/toolRuntime.ts`

## Why It Matters
If a forced response template wins:
- Tool calls like `send_otp`, `list_orders`, `lookup_order` do not execute.
- The user sees a static message instead of the intended OTP/order-selection flow.
- The failure boundary becomes ambiguous unless we persist explicit audit evidence.

## Required Audit Evidence (Deterministic Debugging)
Per the debug principles, we must record **before/after** and **failure boundary** logs.

Minimum evidence required in audit tables:
- `F_audit_events`
  - `POLICY_STATIC_CONFLICT` or `POLICY_CONFLICT_DETECTED`
  - `PRE_MCP_DECISION` (must include `allowed_tool_names`, `final_calls`, `forced_calls`, `policy_conflicts`)
  - `MCP_CALL_SKIPPED` (if any tool is skipped)
  - `FINAL_ANSWER_READY`
- `F_audit_mcp_tools`
  - For skipped/blocked tools, write a blocked record with `policy_decision.allowed=false` and reason.
- `F_audit_turn_specs`
  - Ensure `debug.prefix_json` includes:
    - `policy.tool_rules`, `policy.input_rules`
    - `mcp.last.status`, `mcp.last.function`, `mcp.last.error`
    - `mcp.logs` and `mcp.skipped` (if any)

## Required Log Fields for This Conflict
Emit these fields around the conflict boundary:
- `policy_conflicts[]` with:
  - `kind`, `ruleA`, `ruleB`, `stage`, `intentScope`
- `resolution` string (e.g., `tool_stage_force_response_precedence`)
- `final_calls[]` and `forced_calls[]` at `PRE_MCP_DECISION`
- `allowed_tool_names[]` at `PRE_MCP_DECISION`

## Failure Boundary Rule
If a forced response overrides a tool call:
- Log **immediately before** the decision (policy conflict + pre-mcp decision)
- Log **immediately after** (mcp skipped + final answer)

This guarantees a deterministic trace for why the tool path was suppressed.

