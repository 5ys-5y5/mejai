import { NextRequest } from "next/server";
import { POST as runtimePost } from "./runtimeOrchestrator";

/**
 * Runtime Chat Orchestrator (thin entry)
 * 1) 요청 엔트리 유지
 * 2) 실제 실행 엔진(runtimeOrchestrator)으로 위임
 * 3) 이후 단계적으로 핸들러/도메인 모듈을 조합하는 위치
 */
export async function POST(req: NextRequest) {
  return runtimePost(req);
}
