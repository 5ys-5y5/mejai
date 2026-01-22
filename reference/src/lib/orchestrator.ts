import { supabase } from "./supabase";
import { askBrain, LLMProvider } from "./brain";
import { searchKnowledge } from "./rag";

export interface SessionState {
  id: string;
  org_id: string;
  provider: LLMProvider;
  status: 'listening' | 'summarizing' | 'confirming' | 'answering' | 'completed';
}

/**
 * AI 상담봇 오케스트레이터
 * PRD 2.1장의 8단계 표준 플로우를 제어합니다.
 */
export class Orchestrator {
  /**
   * [플로우 1~4단계]
   * 고객 발화(ASR) 수집 -> 요약 생성 -> 확인(되묻기) 문구 생성
   */
  async processUserSpeech(sessionId: string, orgId: string, transcript: string, provider: LLMProvider) {
    // 1. 요약 생성 (PRD F-C3 충족)
    const summaryPrompt = `
      고객의 발화를 '고객 목적'과 '핵심 사실' 위주로 요약해 주세요.
      
      [고객 발화]
      ${transcript}
    `;
    const summary = await askBrain(provider, summaryPrompt, "상담 요약 가이드라인에 따라 요약하세요.");

    // 2. 확인 질문 생성 (PRD F-C3 충족)
    const confirmPrompt = `
      위 요약 내용을 바탕으로 고객에게 사실 관계를 확인하는 친절한 질문을 한 문장으로 만드세요.
      예: "정리하자면, ~가 맞으신가요?"
      
      [요약 내용]
      ${summary}
    `;
    const confirmationText = await askBrain(provider, confirmPrompt, "확인 질문 생성 모드");

    // 3. DB에 새로운 턴 기록
    const { data: turn, error } = await supabase
      .from("turns")
      .insert([{
        session_id: sessionId,
        transcript_text: transcript,
        summary_text: summary,
        confirm_prompt: confirmationText
      }])
      .select()
      .single();

    if (error) throw error;
    return turn;
  }

  /**
   * [플로우 5~6단계]
   * 고객의 확인/정정 응답 처리 -> RAG 기반 최종 답변 생성
   */
  async handleConfirmation(turnId: string, orgId: string, userResponse: string, provider: LLMProvider) {
    // 1. 의도 파악 (긍정/부정)
    const intentPrompt = `
      고객의 응답이 긍정(동의)인지 부정(정정/불만)인지 판단하여 'YES' 또는 'NO'로만 대답하세요.
      
      [고객 응답]
      ${userResponse}
    `;
    const intent = await askBrain(provider, intentPrompt, "의도 분석 모드");

    if (intent.toUpperCase().includes("YES")) {
      // [6단계] RAG 기반 답변 생성
      const { data: turn } = await supabase.from("turns").select("*").eq("id", turnId).single();
      
      // 지식 베이스 검색 (Multi-tenancy 적용됨)
      const context = await searchKnowledge(orgId, turn.summary_text);
      
      // 최종 답변 생성 (PRD F-C4 충족)
      const answer = await askBrain(provider, turn.summary_text, context);

      await supabase.from("turns").update({
        user_confirmed: true,
        answer_text: answer
      }).eq("id", turnId);

      return { status: "success", answer };
    } else {
      // [5단계 정정] 수정 답변 기록 및 웹 입력/에스컬레이션 유도 (PRD F-C3 루프 제한)
      await supabase.from("turns").update({
        user_confirmed: false,
        correction_text: userResponse
      }).eq("id", turnId);

      return { status: "retry", message: "이해에 실패했습니다. 다시 말씀해 주시거나 웹 페이지에서 입력해 주세요." };
    }
  }
}

export const botOrchestrator = new Orchestrator();
