import {
  SUPPORTED_PROVIDER_KEYS,
  isSupportedProviderKey,
  type SupportedProviderKey,
} from "@/lib/providerConnections";

export type AgentMcpProviderBinding = {
  connection_id: string;
  label: string;
};

export type AgentMcpBindings = Partial<Record<SupportedProviderKey, AgentMcpProviderBinding>>;

type ValidationInput = {
  toolIds: string[];
  bindings: AgentMcpBindings;
  toolProviderById: Map<string, string>;
  availableConnectionIdsByProvider?: Partial<Record<SupportedProviderKey, Set<string>>>;
};

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBindingValue(value: unknown) {
  const record = toRecord(value);
  const connectionId = toText(record.connection_id);
  if (!connectionId) return null;
  return {
    connection_id: connectionId,
    label: toText(record.label),
  };
}

export function normalizeAgentMcpBindings(value: unknown): AgentMcpBindings {
  const record = toRecord(value);
  const next: AgentMcpBindings = {};
  for (const [key, rawBinding] of Object.entries(record)) {
    if (!isSupportedProviderKey(key)) continue;
    const normalized = normalizeBindingValue(rawBinding);
    if (!normalized) continue;
    next[key] = normalized;
  }
  return next;
}

export function groupSupportedToolIdsByProvider(toolIds: string[], toolProviderById: Map<string, string>) {
  return toolIds.reduce(
    (accumulator, toolId) => {
      const providerKey = toolProviderById.get(toolId);
      if (!providerKey || !isSupportedProviderKey(providerKey)) {
        return accumulator;
      }
      accumulator[providerKey] = [...(accumulator[providerKey] || []), toolId];
      return accumulator;
    },
    {} as Partial<Record<SupportedProviderKey, string[]>>
  );
}

export function getSupportedProviderKeysFromToolIds(toolIds: string[], toolProviderById: Map<string, string>) {
  return Array.from(
    new Set(
      toolIds
        .map((toolId) => toolProviderById.get(toolId))
        .filter((providerKey): providerKey is SupportedProviderKey => isSupportedProviderKey(providerKey))
    )
  );
}

export function validateAgentMcpConfiguration(input: ValidationInput) {
  const normalizedToolIds = Array.from(
    new Set(input.toolIds.map((toolId) => String(toolId || "").trim()).filter(Boolean))
  );
  const normalizedBindings = normalizeAgentMcpBindings(input.bindings);
  const supportedProvidersFromTools = getSupportedProviderKeysFromToolIds(normalizedToolIds, input.toolProviderById).sort();
  const bindingKeys = Object.keys(normalizedBindings)
    .filter((providerKey): providerKey is SupportedProviderKey => isSupportedProviderKey(providerKey))
    .sort();

  if (supportedProvidersFromTools.length !== bindingKeys.length) {
    return {
      ok: false as const,
      error: "MCP_PROVIDER_BINDINGS_MISMATCH",
    };
  }

  for (let index = 0; index < supportedProvidersFromTools.length; index += 1) {
    if (supportedProvidersFromTools[index] !== bindingKeys[index]) {
      return {
        ok: false as const,
        error: "MCP_PROVIDER_BINDINGS_MISMATCH",
      };
    }
  }

  for (const providerKey of bindingKeys) {
    const binding = normalizedBindings[providerKey];
    if (!binding?.connection_id) {
      return {
        ok: false as const,
        error: `MCP_PROVIDER_CONNECTION_REQUIRED:${providerKey}`,
      };
    }
    const availableIds = input.availableConnectionIdsByProvider?.[providerKey];
    if (availableIds && !availableIds.has(binding.connection_id)) {
      return {
        ok: false as const,
        error: `MCP_PROVIDER_CONNECTION_NOT_FOUND:${providerKey}`,
      };
    }
  }

  return {
    ok: true as const,
    normalizedToolIds,
    normalizedBindings,
    supportedProviders: supportedProvidersFromTools,
  };
}

export function buildAgentMcpBindingsFromSelections(input: {
  selectedProviders: string[];
  selectedConnectionIdsByProvider: Partial<Record<SupportedProviderKey, string>>;
  connectionLabelsByProvider: Partial<Record<SupportedProviderKey, Map<string, string>>>;
}) {
  const next: AgentMcpBindings = {};
  for (const providerKey of input.selectedProviders) {
    if (!isSupportedProviderKey(providerKey)) continue;
    const connectionId = String(input.selectedConnectionIdsByProvider[providerKey] || "").trim();
    if (!connectionId) continue;
    const label = input.connectionLabelsByProvider[providerKey]?.get(connectionId) || "";
    next[providerKey] = {
      connection_id: connectionId,
      label,
    };
  }
  return next;
}

export function createEmptyProviderToolSelections() {
  return SUPPORTED_PROVIDER_KEYS.reduce(
    (accumulator, providerKey) => {
      accumulator[providerKey] = [];
      return accumulator;
    },
    {} as Record<SupportedProviderKey, string[]>
  );
}
