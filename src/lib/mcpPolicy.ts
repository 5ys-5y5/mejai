type MaskingRules = {
  field_paths?: string[];
  strategy?: "mask";
};

function maskString(value: string) {
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function setPathValue(obj: Record<string, unknown>, path: string, nextValue: unknown) {
  const parts = path.split(".").filter(Boolean);
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = nextValue;
}

function getPathValue(obj: Record<string, unknown>, path: string) {
  const parts = path.split(".").filter(Boolean);
  let current: unknown = obj;
  for (const key of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function applyMasking(payload: Record<string, unknown>, rules?: MaskingRules | null) {
  if (!rules?.field_paths || rules.field_paths.length === 0) {
    return { masked: payload, maskedFields: [] as string[] };
  }
  const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  const maskedFields: string[] = [];
  for (const path of rules.field_paths) {
    const value = getPathValue(clone, path);
    if (typeof value === "string") {
      setPathValue(clone, path, maskString(value));
      maskedFields.push(path);
    }
  }
  return { masked: clone, maskedFields };
}

export function validateToolParams(schema: Record<string, unknown>, params: Record<string, unknown>) {
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  for (const key of required) {
    if (params[key] === undefined || params[key] === null || params[key] === "") {
      return { ok: false, error: `Missing required param: ${key}` };
    }
  }
  const properties = typeof schema.properties === "object" && schema.properties ? schema.properties : {};
  for (const [key, meta] of Object.entries(properties as Record<string, unknown>)) {
    if (!(key in params)) continue;
    const expectedType = (meta as { type?: string }).type;
    if (!expectedType) continue;
    const actual = params[key];
    if (expectedType === "string" && typeof actual !== "string") {
      return { ok: false, error: `Invalid type for ${key}` };
    }
    if (expectedType === "number" && typeof actual !== "number") {
      return { ok: false, error: `Invalid type for ${key}` };
    }
    if (expectedType === "boolean" && typeof actual !== "boolean") {
      return { ok: false, error: `Invalid type for ${key}` };
    }
  }
  return { ok: true };
}

export function checkPolicyConditions(conditions: Record<string, unknown> | null | undefined, params: Record<string, unknown>) {
  if (!conditions) return { ok: true };
  if (conditions.requires_verification && !params.customer_verification_token) {
    return { ok: false, error: "CUSTOMER_VERIFICATION_REQUIRED" };
  }
  return { ok: true };
}
