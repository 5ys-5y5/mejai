import { supabase } from "./supabase";
import { getEmbedding } from "./brain";

/**
 * 1. 특정 사업체의 지식 베이스에 문서 추가 (멀티 테넌시 지원)
 */
export async function addKnowledge(orgId: string, title: string, content: string, category: string) {
  const embedding = await getEmbedding(content);

  const { data, error } = await supabase
    .from("knowledge_base")
    .insert([
      {
        org_id: orgId,
        title,
        content,
        category,
        embedding,
      },
    ]);

  if (error) throw error;
  return data;
}

/**
 * 2. 특정 사업체의 지식만 격리 검색 (Multi-tenant Search)
 */
export async function searchKnowledge(orgId: string, query: string, limit = 3) {
  const queryEmbedding = await getEmbedding(query);

  const { data: documents, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: limit,
    p_org_id: orgId, // 사업체 식별자 필수 전달
  });

  if (error) throw error;
  
  if (!documents || documents.length === 0) return "";
  
  return documents.map((doc: any) => doc.content).join("\n\n---\n\n");
}
