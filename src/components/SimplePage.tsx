import { Card } from "@/components/ui/Card";

export function SimplePage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <Card className="mt-4 p-5">
          {children || (
            <div className="text-sm text-slate-900">
              <div className="font-semibold">UI placeholder</div>
              <div className="mt-2 text-xs text-slate-500">
                이 섹션은 라우팅/페이지 골격만 구성되어 있습니다. 실제
                데이터/액션은 API 연동으로 구현하세요.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
