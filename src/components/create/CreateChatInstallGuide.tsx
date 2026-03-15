"use client";

import { Copy, ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toast } from "sonner";

type CreateChatInstallGuideProps = {
  hasTemplates: boolean;
  isCreating: boolean;
  instanceName?: string | null;
  templateName?: string | null;
  publicKey?: string | null;
  installScript: string;
  installUrl: string;
};

export function CreateChatInstallGuide({
  hasTemplates,
  isCreating,
  instanceName,
  templateName,
  publicKey,
  installScript,
  installUrl,
}: CreateChatInstallGuideProps) {
  if (!hasTemplates) {
    return (
      <Card className="space-y-2 border-amber-200 bg-amber-50 p-4">
        <div className="text-xs font-semibold text-amber-950">설치 시작 전 확인</div>
        <div className="text-sm text-amber-900">
          인스턴스를 설치하려면 먼저 연결할 템플릿이 필요합니다. 관리자 계정에서 템플릿을 만든 뒤 다시 이 탭으로
          돌아오면 됩니다.
        </div>
      </Card>
    );
  }

  const issuedKey = String(publicKey || "").trim();
  const hasInstallTarget = Boolean(instanceName && issuedKey && installScript);
  const title = isCreating
    ? "새 인스턴스 설치 흐름"
    : instanceName
      ? "인스턴스 설치 안내"
      : "인스턴스 생성부터 시작";
  const steps = isCreating
    ? [
        "1. 연결할 템플릿을 선택합니다.",
        "2. 대화창 이름과 접근 권한을 정합니다.",
        "3. 저장하면 발급키와 설치 코드가 준비됩니다.",
        "4. 저장 후 이 카드에서 설치 코드를 복사해 고객사 페이지에 붙여넣습니다.",
      ]
    : instanceName
      ? [
          "1. 현재 선택한 인스턴스가 어떤 템플릿을 쓰는지 확인합니다.",
          "2. 발급키가 준비되었는지 확인합니다.",
          "3. 설치 코드를 고객사 페이지 body 끝에 붙여넣습니다.",
          "4. Preview URL 로 먼저 확인한 뒤 실제 페이지에 반영합니다.",
        ]
      : [
          "1. 좌측 상단의 `새 대화창` 버튼으로 인스턴스를 만듭니다.",
          "2. 연결할 템플릿을 선택합니다.",
          "3. 저장 후 발급된 키를 포함한 설치 코드를 복사합니다.",
          "4. 고객사 페이지에 붙여넣고 새로고침해 런처를 확인합니다.",
        ];

  return (
    <Card className="space-y-4 border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold text-emerald-950">{title}</div>
          <div className="mt-1 text-[11px] text-emerald-900">
            대화창 인스턴스는 dedicated 설치 대상입니다. 템플릿을 골라 인스턴스를 만든 뒤, 해당 인스턴스 전용 키로
            배포합니다.
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasInstallTarget}
          className="border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100"
          onClick={() => {
            if (!installScript) return;
            void navigator.clipboard.writeText(installScript);
            toast.success("인스턴스 설치 코드가 복사되었습니다.");
          }}
        >
          <Copy className="mr-1 h-4 w-4" />
          설치 코드 복사
        </Button>
      </div>

      <div className="grid gap-2 text-xs text-emerald-950">
        {steps.map((step) => (
          <div key={step} className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2">
            {step}
          </div>
        ))}
      </div>

      {instanceName ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-900">현재 설치 대상</div>
            <div className="text-xs text-slate-600">
              인스턴스: <span className="font-semibold text-slate-900">{instanceName}</span>
            </div>
            <div className="text-xs text-slate-600">
              연결 템플릿: <span className="font-semibold text-slate-900">{templateName || "-"}</span>
            </div>
            <div className="text-xs text-slate-600">
              발급키: <span className="font-mono text-slate-900">{issuedKey || "저장 후 발급됩니다."}</span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-emerald-700" />
              미리 확인
            </div>
            <div className="text-[11px] text-slate-500">Preview URL 은 현재 인스턴스 설정과 오버라이드를 반영한 embed 주소입니다.</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!installUrl}
              className="border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50"
              onClick={() => {
                if (!installUrl) return;
                window.open(installUrl, "_blank", "noreferrer");
              }}
            >
              Preview URL 열기
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {instanceName ? (
        <div className="rounded-xl border border-emerald-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-slate-900">설치 코드</div>
          <div className="whitespace-pre-wrap font-mono text-xs text-slate-700">
            {installScript || "저장 후 실제 설치 코드가 표시됩니다."}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
