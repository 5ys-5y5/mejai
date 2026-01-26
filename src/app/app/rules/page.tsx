import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function RulesPage() {
  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">규칙</h1>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">라우팅 규칙</div>
            <div className="mt-2 text-xs text-slate-500">
              예: 환불/결제 → 결제 큐, 배송 → 배송 큐, 분쟁 → 사람 상담 이관
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-900">규칙 #12</span>
                  <Badge variant="green">활성</Badge>
                </div>
                <div className="mt-1 text-slate-500">의도=환불 또는 정책=차지백 → 사람 이관</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-900">규칙 #05</span>
                  <Badge variant="amber">초안</Badge>
                </div>
                <div className="mt-1 text-slate-500">의도=배송 → 도구=배송조회</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">에스컬레이션 정책</div>
            <div className="mt-2 text-xs text-slate-500">
              예: 본인 확인 실패, 개인정보 요청, 고위험 민원 시 강제 이관
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-900">개인정보 요청</span>
                  <Badge variant="green">활성</Badge>
                </div>
                <div className="mt-1 text-slate-500">마스킹 필수, 실패 시 사람 이관</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-4 p-4">
          <div className="text-sm font-semibold text-slate-900">MCP의 역할 (툴/시스템 통합)</div>
          <div className="mt-2 text-xs text-slate-500">
            MCP를 쓰면, LLM이 직접 DB나 내부 API를 무작정 두드리는 형태가 아니라 표준화된 Tool 서버로
            기능을 호출합니다.
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-900 font-medium">표준화된 Tool 제공</div>
              <div className="mt-1 text-slate-500">
                주문조회, 배송추적, 환불정책 조회, 상담 티켓 생성, 인증(OTP) 발송 등을
                표준화된 Tool 서버로 제공합니다.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-900 font-medium">테넌트별 허용 범위</div>
              <div className="mt-1 text-slate-500">
                브랜드별로 허용된 Tool만 노출하고 파라미터 스키마를 엄격히 강제합니다.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-900 font-medium">백엔드 다변화 대응</div>
              <div className="mt-1 text-slate-500">
                브랜드 A는 Shopify, 브랜드 B는 카페24, 브랜드 C는 자체 ERP처럼 백엔드가 달라도
                LLM 입장에서는 동일한 인터페이스로 사용합니다.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-900 font-medium">안전한 기능 카탈로그</div>
              <div className="mt-1 text-slate-500">
                MCP는 LLM이 쓸 수 있는 안전한 기능 카탈로그를 제공하고,
                도구 호출의 권한/감사로그/속도제한/마스킹을 중앙에서 수행하기 좋습니다.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
