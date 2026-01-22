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
      </div>
    </div>
  );
}