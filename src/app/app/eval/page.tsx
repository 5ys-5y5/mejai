export default function EvalPage() {
  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">평가/관리</h1>
        <div className="mt-4 text-sm font-semibold text-slate-900">평가 항목</div>
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
          {[
            { k: "정책 준수", v: "통과" },
            { k: "정확성", v: "검토 필요" },
            { k: "에스컬레이션 적합성", v: "통과" },
            { k: "개인정보 마스킹", v: "대기" },
          ].map((it) => (
            <div key={it.k} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-500">{it.k}</div>
              <div className="mt-1 font-medium text-slate-900">{it.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}