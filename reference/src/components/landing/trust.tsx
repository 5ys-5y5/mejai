import { Shield, Lock, EyeOff, Search } from "lucide-react";

const items = [
  {
    title: "보안 가이드 준수",
    description: "금융 및 의료 보안 가이드라인을 준수하는 강력한 인프라를 사용합니다.",
    icon: Shield,
  },
  {
    title: "데이터 암호화",
    description: "모든 통화 녹취와 텍스트 데이터는 저장 및 전송 시 암호화됩니다.",
    icon: Lock,
  },
  {
    title: "개인정보 비식별화",
    description: "전화번호, 주소 등 민감한 개인정보는 자동으로 마스킹 처리됩니다.",
    icon: EyeOff,
  },
  {
    title: "투명한 감사 로그",
    description: "모든 데이터 접근 및 설정 변경 이력은 감사 로그로 기록됩니다.",
    icon: Search,
  },
];

export function Trust() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            신뢰할 수 있는 데이터 관리와 보안
          </h2>
          <p className="text-lg text-muted-foreground">
            고객의 소중한 정보를 안전하게 보호하는 것이 우리의 최우선 가치입니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <item.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
