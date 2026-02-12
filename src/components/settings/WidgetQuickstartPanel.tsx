"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

type WidgetConfig = {
  id: string;
  name?: string | null;
  public_key?: string | null;
  allowed_domains?: string[] | null;
  is_active?: boolean | null;
};

export function WidgetQuickstartPanel() {
  const [loading, setLoading] = useState(true);
  const [widget, setWidget] = useState<WidgetConfig | null>(null);

  const loadWidget = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ item: WidgetConfig | null }>("/api/widgets");
      setWidget(res.item || null);
    } catch (error) {
      setWidget(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWidget();
  }, [loadWidget]);

  const publicKey = (widget?.public_key || "").trim();
  const snippet = useMemo(() => {
    if (!publicKey) return "";
    return `<script async src=\"https://mejai.help/widget.js\" data-key=\"${publicKey}\"></script>`;
  }, [publicKey]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">시작 안내</div>
        <div className="mt-2 text-xs text-slate-600">
          아래 단계는 비개발자도 따라할 수 있도록 작성되었습니다. 순서대로 진행하세요.
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-700">
          <div>1. 이 페이지는 자동으로 `/api/widgets`를 호출하여 위젯 키를 불러옵니다.</div>
          <div>
            2. 위젯 키가 보이면 설치 코드를 복사합니다. 위젯 키가 보이지 않으면 “채팅 위젯” 탭에서
            먼저 저장하세요.
          </div>
          <div>
            3. 고객사 홈페이지의 HTML에서 `<code>body</code>` 태그 끝에 설치 코드를 붙여넣습니다.
          </div>
          <div>
            4. 고객사 홈페이지를 새로고침하면 우측 하단에 채팅 아이콘(런처)이 표시됩니다.
          </div>
          <div>
            5. 아이콘을 클릭하면 위젯이 열리고, 이때 서버에서 자동으로 토큰이 발급됩니다.
          </div>
          <div>
            6. 메시지를 입력해 정상 응답이 나오면 설치 완료입니다.
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">/api/widgets 호출 확인</div>
        <div className="mt-2 text-xs text-slate-600">
          이 섹션은 `/api/widgets` 응답을 기반으로 키와 상태를 표시합니다.
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          {loading ? "불러오는 중..." : widget ? "정상 (위젯 데이터 수신 완료)" : "실패 (위젯 데이터 없음)"}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          위젯 데이터가 없으면 “채팅 위젯” 탭에서 설정을 저장해야 합니다.
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">설치 코드</div>
        <div className="mt-2 text-xs text-slate-600">
          고객사 페이지의 <code>body</code> 태그 끝에 1줄만 삽입하면 됩니다.
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700 whitespace-pre-wrap">
          {snippet || "위젯 키가 아직 생성되지 않았습니다."}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!snippet}
            onClick={() => {
              if (!snippet) return;
              void navigator.clipboard.writeText(snippet);
              toast.success("설치 코드가 복사되었습니다.");
            }}
          >
            코드 복사
          </Button>
          <div className="text-xs text-slate-500">
            복사할 키:{" "}
            <span className="font-mono text-slate-700">{publicKey || "-"}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">허용 도메인</div>
        <div className="mt-2 text-xs text-slate-600">등록된 도메인에서만 위젯이 동작합니다.</div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          {loading ? (
            "불러오는 중..."
          ) : widget?.allowed_domains && widget.allowed_domains.length > 0 ? (
            widget.allowed_domains.join(", ")
          ) : (
            "허용 도메인이 등록되지 않았습니다."
          )}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          도메인 편집은 “채팅 위젯” 탭에서 가능합니다.
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">설치 상태</div>
        <div className="mt-2 text-xs text-slate-600">
          런처 클릭 시 위젯이 열리고, `/api/widget/init`가 호출되어 토큰이 발급됩니다.
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          {widget?.is_active ? "미확인 (최근 신호 없음)" : "비활성 상태"}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          토큰은 자동으로 발급되며 관리자 화면에 노출되지 않습니다. 위젯이 열리고 채팅이 가능하면 정상입니다.
        </div>
      </Card>
    </div>
  );
}
