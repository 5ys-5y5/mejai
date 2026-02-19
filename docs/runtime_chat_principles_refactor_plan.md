# Runtime Chat Principles Refactor Plan

## Goals
- Stop regressions caused by later rules overriding earlier resolved behavior.
- Make rule ownership and precedence explicit so conflicts resolve deterministically.
- Remove duplicated definitions and keep one source of truth for each concept.
- Make the rule graph composable like lego blocks so intent flows stay consistent.

## Scope
- All rule-like definitions under `src/app/api/runtime/chat/**` including:
- `policies/` (principles, prompt templates, render rules, decision policies).
- `runtime/` (stage gates, slot flow, intent resolution, tool gating).
- `services/` (audit, end-user matching, data access, MCP tooling).
- `handlers/` (intent-specific policy logic).
- `shared/` (contracts, enums, response schema).

## Problem Statement
- Rule growth caused late-stage logic to override earlier resolved outputs.
- Multiple definitions express the same idea with different names or thresholds.
- Precedence between rules is implicit and therefore inconsistent.

## Target Model
### Layered Rule Hierarchy
- Layer 0: Hard Guards
- Layer 1: Intent Contract
- Layer 2: Slot Gate
- Layer 3: Tool Gate
- Layer 4: Response Construction
- Layer 5: UI Render

### Rule Types
- Primitive rule: Smallest invariant, single responsibility, one owner.
- Composed rule: A named bundle of primitives for an intent or stage.
- Resolver: Chooses one composed rule per intent per stage.

## Refactor Plan
### 1. Inventory and Ownership
- Create an inventory table of every rule-like definition with:
- File path, rule name, intent scope, stage, and current consumers.
- Identify duplicates and conflicts.
- Assign a single owner module per rule.

### 2. Normalize to Primitives
- Extract duplicated logic into primitives in a single module.
- Use strict naming convention: `requireX`, `blockY`, `allowZ`.
- Keep primitives data-only; no side effects.

### 3. Compose per Intent
- Define composed rules per intent and stage.
- Composition is explicit via references, never copy.
- Add a resolver map to select composed rules per intent.

### 4. Precedence Enforcement
- Enforce layer ordering in a single resolver.
- If multiple rules apply in the same layer, resolve by:
- Explicit priority list.
- Tiebreaker: most specific intent scope wins.

### 5. Migration of Call Sites
- Update runtime stages to consume composed rules only.
- Replace scattered `shouldX()` calls with a stage-specific rule bundle.
- Keep existing getters as thin proxies to new primitives during transition.

### 6. Conflict Detection
- Add a build-time validation script:
- Detect duplicate primitive names.
- Detect composed rules referencing non-existent primitives.
- Detect multiple owners for one rule.

### 7. Audit Evidence
- Add rule provenance in `F_audit_events`:
- `rule_layer`, `rule_id`, `owner_module`, `resolution_path`.
- Log pre/post stage decisions for boundary tracing.

## Deliverables
- `policies/primitives.ts` containing all primitive rules.
- `policies/composed.ts` containing composed rule sets by intent/stage.
- `policies/registry.ts` mapping intent -> composed rule sets.
- Updated runtime stages to consume the registry.
- Validation script to prevent regression.

## Migration Steps
1. Build inventory and tag duplicates.
2. Implement primitives and redirect old getters.
3. Build composed rule bundles for top 3 intents first.
4. Update runtime stages for those intents.
5. Expand to remaining intents and delete legacy duplicates.
6. Add validation script to CI.

## Acceptance Criteria
- Same intent produces same decision path across environments.
- No duplicated primitives remain in `runtime/chat/**`.
- Every stage has a single composed rule bundle.
- Conflicts are resolved by explicit precedence, not incidental ordering.
- Audit logs show rule provenance for every stage transition.

## Notes
- This plan preserves existing external behavior while eliminating hidden overrides.
- Rule order is centralized in the resolver, not scattered across modules.
