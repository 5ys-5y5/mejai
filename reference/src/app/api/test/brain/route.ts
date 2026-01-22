import { NextResponse } from "next/server";
import { askBrain, LLMProvider } from "@/lib/brain";
import { searchKnowledge } from "@/lib/rag";

export async function POST(req: Request) {
  try {
    const { orgId, query, provider } = await req.json();

    if (!orgId || !query || !provider) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    // 1. 관련 지식 검색 (RAG)
    const context = await searchKnowledge(orgId, query);

    // 2. 선택된 두뇌(Provider)로 답변 생성
    const answer = await askBrain(provider as LLMProvider, query, context);

    return NextResponse.json({ 
      success: true, 
      answer, 
      context: context ? "지식 베이스 참조됨" : "참조할 지식 없음" 
    });
  } catch (error: any) {
    console.error("테스트 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
