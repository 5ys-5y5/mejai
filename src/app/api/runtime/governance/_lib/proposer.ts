import OpenAI from "openai";
import type { PrincipleBaseline } from "./principleBaseline";
import type { PrincipleViolation, RuntimeEvent, RuntimeTurn } from "./detector";

export type PatchProposal = {
  proposal_id: string;
  violation_id: string;
  principle_key: string;
  runtime_scope: string;
  session_id: string;
  turn_id: string;
  status: "pending";
  title: string;
  why_failed: string;
  how_to_improve: string;
  rationale: string;
  target_files: string[];
  change_plan: string[];
  suggested_diff: string | null;
  confidence: number;
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function modelName() {
  return String(process.env.RUNTIME_GOVERNANCE_MODEL || "gpt-4o-mini");
}

function fallbackProposal(input: {
  violation: PrincipleViolation;
  baseline: PrincipleBaseline;
  recentTurns: RuntimeTurn[];
  recentEvents: RuntimeEvent[];
}): PatchProposal {
  const { violation, baseline } = input;
  const proposalId = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mcpFailed = input.recentEvents.some((event) => event.event_type === "MCP_TOOL_FAILED");
  const defaultFiles =
    violation.runtime_scope === "chat"
      ? [
          "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
          "src/app/api/runtime/chat/runtime/toolRuntime.ts",
          "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
        ]
      : ["src/app/api/runtime/restock/dispatch/route.ts"];
  const plan = [
    "Add deterministic guard for known slot reuse before fallback prompt generation.",
    "If MCP failure happens, provide failure-aware guidance without re-asking already known user slots.",
    "Emit explicit PRINCIPLE_REUSE_APPLIED or PRINCIPLE_REUSE_BLOCKED event with before/after evidence.",
  ];
  return {
    proposal_id: proposalId,
    violation_id: violation.violation_id,
    principle_key: violation.principle_key,
    runtime_scope: violation.runtime_scope,
    session_id: violation.session_id,
    turn_id: violation.turn_id,
    status: "pending",
    title: mcpFailed
      ? "Prevent repeated slot question after MCP failure"
      : "Enforce no-repeat slot question rule",
    why_failed: mcpFailed
      ? "MCP failure path fell back to a generic prompt that re-asked an already known slot."
      : "Fallback prompt ignored previously confirmed slot context.",
    how_to_improve:
      "Add deterministic no-repeat guard before fallback response selection and emit explicit reuse-decision audit events.",
    rationale: `Align runtime output with ${baseline.source} memory principle.`,
    target_files: defaultFiles,
    change_plan: plan,
    suggested_diff: null,
    confidence: mcpFailed ? 0.86 : 0.72,
    created_at: nowIso(),
  };
}

function buildPrompt(input: {
  violation: PrincipleViolation;
  baseline: PrincipleBaseline;
  recentTurns: RuntimeTurn[];
  recentEvents: RuntimeEvent[];
}) {
  return [
    "You are a runtime governance engineer.",
    "Generate a compact JSON patch proposal for a principle violation.",
    "Rules:",
    "- Use principle baseline as source of truth.",
    "- Focus on deterministic fix first, then optional LLM prompt fix.",
    "- Include target_files, change_plan, suggested_diff (unified diff or null).",
    "- Keep only JSON, no markdown.",
    `Principle baseline: ${JSON.stringify(input.baseline)}`,
    `Violation: ${JSON.stringify(input.violation)}`,
    `Recent turns: ${JSON.stringify(input.recentTurns)}`,
    `Recent events: ${JSON.stringify(input.recentEvents)}`,
  ].join("\n");
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function buildPatchProposal(input: {
  violation: PrincipleViolation;
  baseline: PrincipleBaseline;
  recentTurns: RuntimeTurn[];
  recentEvents: RuntimeEvent[];
}): Promise<PatchProposal> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return fallbackProposal(input);

  const proposalId = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const client = new OpenAI({ apiKey });
  const prompt = buildPrompt(input);
  try {
    const completion = await client.chat.completions.create({
      model: modelName(),
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return strict JSON only." },
        { role: "user", content: prompt },
      ],
    });
    const content = String(completion.choices[0]?.message?.content || "").trim();
    const parsed = parseJson(content);
    if (!parsed) return fallbackProposal(input);
    return {
      proposal_id: proposalId,
      violation_id: input.violation.violation_id,
      principle_key: input.violation.principle_key,
      runtime_scope: input.violation.runtime_scope,
      session_id: input.violation.session_id,
      turn_id: input.violation.turn_id,
      status: "pending",
      title: String(parsed.title || "Principle violation patch proposal"),
      why_failed: String(
        parsed.why_failed || "Runtime fallback path did not respect memory reuse principle under current branch."
      ),
      how_to_improve: String(
        parsed.how_to_improve ||
          "Add deterministic guard to reuse known slots and avoid repeated question in fallback paths."
      ),
      rationale: String(parsed.rationale || `Align runtime behavior with ${input.baseline.source}`),
      target_files: Array.isArray(parsed.target_files)
        ? parsed.target_files.map((v) => String(v)).filter(Boolean)
        : [],
      change_plan: Array.isArray(parsed.change_plan)
        ? parsed.change_plan.map((v) => String(v)).filter(Boolean)
        : [],
      suggested_diff: typeof parsed.suggested_diff === "string" ? parsed.suggested_diff : null,
      confidence: Number(parsed.confidence || 0.7),
      created_at: nowIso(),
    };
  } catch {
    return fallbackProposal(input);
  }
}
