import { Card } from "@/components/ui/Card";

export default function BillingPage() {
  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">결제/플랜</h1>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { name: "스타터", price: "₩0", desc: "개발/검증용" },
            { name: "프로", price: "₩199,000", desc: "운영 팀용" },
            { name: "엔터프라이즈", price: "맞춤형", desc: "보안/컴플라이언스" },
          ].map((p) => (
            <Card key={p.name} className="p-5">
              <div className="text-sm font-semibold text-slate-900">{p.name}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{p.price}</div>
              <div className="mt-2 text-xs text-slate-500">{p.desc}</div>
              <button className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                선택
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
