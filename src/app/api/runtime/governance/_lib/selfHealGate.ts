import type { PrincipleViolation } from "./detector";
import {
  SELF_HEAL_REQUIRED_CONTRACT_FIELDS,
  SELF_HEAL_REQUIRED_EXCEPTION_FIELDS,
  SELF_HEAL_EVIDENCE_BY_PRINCIPLE,
  SELF_HEAL_EVIDENCE_BY_VIOLATION,
} from "../selfHeal/principles";

export type ExceptionStats = {
  repeat_count_7d: number;
  repeat_count_30d: number;
};

type SelfHealGateInput = {
  proposal: Record<string, unknown>;
  violation: PrincipleViolation;
  exceptionStats?: ExceptionStats;
  now?: Date;
};

const HARD_CODED_BRANCH_REGEX = /\b(if|else if)\s*\([^\)]*([=!]==?|===)\s*(["'`][^"'`]+["'`]|\d+)\s*\)/;
const SWITCH_LITERAL_REGEX = /\bswitch\s*\([^\)]*\)\s*\{[\s\S]*?\bcase\s+(["'`][^"'`]+["'`]|\d+)\s*:/;
const CHANGE_PLAN_KEYWORDS = ["특정 케이스", "예외 처리", "하드코딩", "only this case"];

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isMissing(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function readString(value: unknown) {
  return String(value || "").trim();
}

function extractViolationKey(violation: PrincipleViolation) {
  const explicit = readString((violation as Record<string, unknown>).violation_key);
  if (explicit) return explicit;
  const rawId = readString(violation.violation_id);
  const prefix = `pv_${readString(violation.session_id)}_${readString(violation.turn_id)}_`;
  if (rawId.startsWith(prefix)) return rawId.slice(prefix.length);
  if (rawId.startsWith("pv_")) {
    const parts = rawId.split("_");
    if (parts.length >= 4) return parts.slice(3).join("_");
  }
  return "";
}

export function computeExceptionFingerprint(violation: PrincipleViolation) {
  const principleKey = normalizeText(violation.principle_key) || "-";
  const violationKey = normalizeText(extractViolationKey(violation)) || "-";
  const evidence = (violation.evidence || {}) as Record<string, unknown>;
  const mismatchType = normalizeText(evidence.mismatch_type) || "-";
  const toolName = normalizeText(evidence.tool_name) || "-";
  const normalized = [principleKey, violationKey, mismatchType, toolName].map((v) => v.replace(/\s+/g, "_"));
  return `ex:${normalized.join(":")}`;
}

export function detectCaseSpecificSignals(proposal: Record<string, unknown>) {
  const signals: string[] = [];
  const targetFiles = Array.isArray(proposal.target_files) ? proposal.target_files : [];
  if (targetFiles.length <= 1) {
    const file = String(targetFiles[0] || "").replace(/\\/g, "/");
    if (file.includes("/handlers/") || file.includes("/runtime/")) {
      signals.push("single_target_file");
    }
  }
  const suggestedDiff = readString(proposal.suggested_diff);
  if (suggestedDiff && (HARD_CODED_BRANCH_REGEX.test(suggestedDiff) || SWITCH_LITERAL_REGEX.test(suggestedDiff))) {
    signals.push("hardcoded_branch");
  }
  const changePlan = Array.isArray(proposal.change_plan) ? proposal.change_plan : [];
  const planText = normalizeText(changePlan.join(" "));
  if (planText && CHANGE_PLAN_KEYWORDS.some((keyword) => planText.includes(keyword.toLowerCase()))) {
    signals.push("change_plan_case_specific");
  }
  return signals;
}

function parseExceptionExpiry(input: {
  exceptionExpiry: string;
  exceptionStats: ExceptionStats;
  createdAt: string;
  now: Date;
}) {
  const { exceptionExpiry, exceptionStats, createdAt, now } = input;
  const trimmed = exceptionExpiry.trim();
  if (!trimmed) {
    const created = createdAt ? new Date(createdAt) : null;
    if (!created || Number.isNaN(created.getTime())) {
      return { expired: false, invalid: true, reason: "exception_expiry_default_invalid" };
    }
    const expiryDate = new Date(created.getTime() + 30 * 24 * 3600 * 1000);
    return { expired: now.getTime() > expiryDate.getTime(), invalid: false, reason: "exception_expiry_default_30d" };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T23:59:59Z`);
    if (Number.isNaN(date.getTime())) return { expired: false, invalid: true, reason: "exception_expiry_invalid_date" };
    return { expired: now.getTime() > date.getTime(), invalid: false, reason: "exception_expiry_date" };
  }
  const issueMatch = trimmed.match(/^issue_count\s*>=\s*(\d+)$/);
  if (issueMatch) {
    const threshold = Number(issueMatch[1] || 0);
    return {
      expired: exceptionStats.repeat_count_30d >= threshold,
      invalid: false,
      reason: "exception_expiry_issue_count",
    };
  }
  const metric7 = trimmed.match(/^metric:repeat_count_7d\s*>=\s*(\d+)$/);
  if (metric7) {
    const threshold = Number(metric7[1] || 0);
    return {
      expired: exceptionStats.repeat_count_7d >= threshold,
      invalid: false,
      reason: "exception_expiry_repeat_count_7d",
    };
  }
  const metric30 = trimmed.match(/^metric:repeat_count_30d\s*>=\s*(\d+)$/);
  if (metric30) {
    const threshold = Number(metric30[1] || 0);
    return {
      expired: exceptionStats.repeat_count_30d >= threshold,
      invalid: false,
      reason: "exception_expiry_repeat_count_30d",
    };
  }
  return { expired: false, invalid: true, reason: "exception_expiry_invalid_format" };
}

function computePromotionRequired(input: {
  exceptionStats: ExceptionStats;
  exceptionExpiry: string;
  createdAt: string;
  now: Date;
}) {
  const { exceptionStats, exceptionExpiry, createdAt, now } = input;
  if (exceptionStats.repeat_count_7d >= 2) {
    return { required: true, reason: "repeat_count_7d>=2", invalidExpiry: false };
  }
  if (exceptionStats.repeat_count_30d >= 3) {
    return { required: true, reason: "repeat_count_30d>=3", invalidExpiry: false };
  }
  const expiryResult = parseExceptionExpiry({
    exceptionExpiry,
    exceptionStats,
    createdAt,
    now,
  });
  if (expiryResult.invalid) {
    return { required: true, reason: expiryResult.reason, invalidExpiry: true };
  }
  if (expiryResult.expired) {
    return { required: true, reason: expiryResult.reason, invalidExpiry: false };
  }
  return { required: false, reason: "-", invalidExpiry: false };
}

function getRequiredEvidenceFields(violation: PrincipleViolation) {
  const principleKey = readString(violation.principle_key);
  const violationKey = extractViolationKey(violation);
  return (
    SELF_HEAL_EVIDENCE_BY_PRINCIPLE[principleKey] ||
    SELF_HEAL_EVIDENCE_BY_VIOLATION[violationKey] ||
    []
  );
}

export function buildSelfHealGate(input: SelfHealGateInput) {
  const { proposal, violation } = input;
  const now = input.now ?? new Date();
  const exceptionStats = input.exceptionStats || { repeat_count_7d: 0, repeat_count_30d: 0 };
  const evidence = (violation.evidence || {}) as Record<string, unknown>;
  const signals = detectCaseSpecificSignals(proposal);
  if (evidence.reject_case_specific_primary_fix === true) {
    signals.push("evidence_reject_case_specific_primary_fix");
  }

  const requiredContractFields = SELF_HEAL_REQUIRED_CONTRACT_FIELDS;
  const requiredExceptionFields = SELF_HEAL_REQUIRED_EXCEPTION_FIELDS;
  const missingContractFields = requiredContractFields.filter((field) => isMissing(proposal[field]));
  const missingExceptionFields = requiredExceptionFields.filter((field) => isMissing(proposal[field]));
  const requiredEvidenceFields = getRequiredEvidenceFields(violation);
  const missingEvidenceFields = requiredEvidenceFields.filter((field) => isMissing(evidence[field]));

  const track = signals.length > 0 ? "exception" : "contract";
  let promotionRequired = false;
  let promotionReason = "-";
  if (track === "exception") {
    const exceptionExpiry = readString(proposal["exception_expiry"]);
    const createdAt = readString(proposal["created_at"]) || now.toISOString();
    const promotionResult = computePromotionRequired({
      exceptionStats,
      exceptionExpiry,
      createdAt,
      now,
    });
    promotionRequired = promotionResult.required;
    promotionReason = promotionResult.reason;
    if (promotionResult.invalidExpiry && !missingExceptionFields.includes("exception_expiry")) {
      missingExceptionFields.push("exception_expiry");
    }
  }

  return {
    track,
    gate_version: "v1",
    contract_fields_ok: missingContractFields.length === 0,
    exception_fields_ok: missingExceptionFields.length === 0,
    evidence_contract_ok: missingEvidenceFields.length === 0,
    case_specific_signals: signals,
    missing_contract_fields: missingContractFields,
    missing_exception_fields: missingExceptionFields,
    missing_evidence_fields: missingEvidenceFields,
    promotion_required: promotionRequired,
    promotion_reason: promotionReason,
    exception_fingerprint: computeExceptionFingerprint(violation),
    exception_stats: exceptionStats,
  };
}
