export type RuntimeFlags = {
  restock_lite: boolean;
};

export const DEFAULT_RUNTIME_FLAGS: RuntimeFlags = {
  restock_lite: true,
};

export function resolveRuntimeFlags(override?: Partial<RuntimeFlags> | null): RuntimeFlags {
  if (!override) return { ...DEFAULT_RUNTIME_FLAGS };
  return {
    ...DEFAULT_RUNTIME_FLAGS,
    ...override,
  };
}
