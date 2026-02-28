import { runConversation, type RuntimeRunResponse } from "@/lib/conversation/client/runtimeClient";
import { resolveRuntimeFlags } from "@/lib/runtimeFlags";

export type LaboratoryRunInput = {
  pageKey: string;
  route: string;
  llm: string;
  kbId?: string;
  adminKbIds?: string[];
  mcpProviderKeys?: string[];
  mcpToolIds?: string[];
  message: string;
  sessionId?: string | null;
};

export async function runLaboratoryMessage(input: LaboratoryRunInput): Promise<RuntimeRunResponse> {
  const pageKey = input.pageKey;
  const runtimeFlags = resolveRuntimeFlags();
  return runConversation("/api/laboratory/run", {
    page_key: pageKey,
    route: input.route,
    llm: input.llm,
    kb_id: input.kbId || "",
    admin_kb_ids: input.adminKbIds || [],
    mcp_provider_keys: input.mcpProviderKeys || [],
    mcp_tool_ids: input.mcpToolIds || [],
    message: input.message,
    session_id: input.sessionId || undefined,
    runtime_flags: runtimeFlags,
  });
}
