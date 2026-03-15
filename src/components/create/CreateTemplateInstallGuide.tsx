"use client";

import { Copy, ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toast } from "sonner";

type CreateTemplateInstallGuideProps = {
  templateName: string;
  publicKey?: string | null;
  installScript: string;
  installUrl: string;
  previewUrl: string;
};

const steps = [
  "1. 좌측 목록에서 설치할 템플릿을 선택합니다.",
  "2. 템플릿키가 발급되어 있는지 확인합니다.",
  "3. 설치 코드를 고객사 페이지의 body 끝에 붙여넣습니다.",
  "4. 필요하면 설치 링크 또는 위젯 UI 링크로 바로 미리봅니다.",
];

export function CreateTemplateInstallGuide({
  templateName,
  publicKey,
  installScript,
  installUrl,
  previewUrl,
}: CreateTemplateInstallGuideProps) {
  const issuedKey = String(publicKey || "").trim();
  const canInstall = Boolean(issuedKey && installScript);

  return (
    <Card className="space-y-4 border-sky-200 bg-sky-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold text-sky-950">템플릿 설치 안내</div>
          <div className="mt-1 text-[11px] text-sky-900">
            선택한 템플릿 하나만으로 설치가 가능합니다. 아래 값은 고객사 페이지에 템플릿 위젯을 붙일 때 그대로
            사용합니다.
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canInstall}
          className="border-sky-300 bg-white text-sky-900 hover:bg-sky-100"
          onClick={() => {
            if (!installScript) return;
            void navigator.clipboard.writeText(installScript);
            toast.success("템플릿 설치 코드가 복사되었습니다.");
          }}
        >
          <Copy className="mr-1 h-4 w-4" />
          설치 코드 복사
        </Button>
      </div>

      <div className="grid gap-2 text-xs text-sky-950">
        {steps.map((step) => (
          <div key={step} className="rounded-xl border border-sky-200 bg-white/80 px-3 py-2">
            {step}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-xl border border-sky-200 bg-white p-3">
          <div className="text-xs font-semibold text-slate-900">현재 설치 대상</div>
          <div className="text-xs text-slate-600">
            템플릿명: <span className="font-semibold text-slate-900">{templateName}</span>
          </div>
          <div className="text-xs text-slate-600">
            템플릿키:{" "}
            <span className="font-mono text-slate-900">{issuedKey || "발급 후 설치 코드를 사용할 수 있습니다."}</span>
          </div>
          <div className="text-xs text-slate-600">
            설치 방식: <span className="font-semibold text-slate-900">widget_id + public_key</span>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-sky-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <KeyRound className="h-4 w-4 text-sky-700" />
            바로 확인
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!installUrl}
              className="border-sky-200 bg-white text-slate-700 hover:bg-sky-50"
              onClick={() => {
                if (!installUrl) return;
                window.open(installUrl, "_blank", "noreferrer");
              }}
            >
              설치 링크
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!previewUrl}
              className="border-sky-200 bg-white text-slate-700 hover:bg-sky-50"
              onClick={() => {
                if (!previewUrl) return;
                window.open(previewUrl, "_blank", "noreferrer");
              }}
            >
              위젯 UI 링크
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="text-[11px] text-slate-500">
            설치 링크는 embed 런처 확인용이고, 위젯 UI 링크는 preview 상태의 위젯 화면 자체를 바로 열 때 사용합니다.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-sky-200 bg-white p-3">
        <div className="mb-2 text-xs font-semibold text-slate-900">설치 코드</div>
        <div className="whitespace-pre-wrap font-mono text-xs text-slate-700">
          {installScript || "템플릿키가 준비되면 여기에 실제 설치 코드가 표시됩니다."}
        </div>
      </div>
    </Card>
  );
}
