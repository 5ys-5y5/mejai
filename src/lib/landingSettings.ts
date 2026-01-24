export type LandingSettings = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  landingFontFamily: string;
  heroTitleSize: number;
  heroSubtitleSize: number;
  heroContentPaddingTop: number;
  heroContentPaddingBottom: number;
  heroContentMarginTop: number;
  heroContentMarginBottom: number;
  heroContentMaxWidth: number;
  sectionsPaddingTop: number;
  sectionsPaddingBottom: number;
  sectionsMarginTop: number;
  sectionsMarginBottom: number;
  featuresEyebrow: string;
  featuresTitle: string;
  featuresSubtitle: string;
  featuresTitleSize: number;
  featuresSubtitleSize: number;
  featuresCards: Array<{ title: string; description: string }>;
  processTitle: string;
  processSubtitle: string;
  processTitleSize: number;
  processSubtitleSize: number;
  processSteps: Array<{ id: string; title: string; description: string }>;
  comparisonTitle: string;
  comparisonSubtitle: string;
  comparisonTitleSize: number;
  comparisonSubtitleSize: number;
  comparisonRows: Array<{ feature: string; traditional: string; ai: string }>;
  consoleTitle: string;
  consoleSubtitle: string;
  consoleTitleSize: number;
  consoleSubtitleSize: number;
  consoleCards: Array<{ title: string; description: string }>;
  trustTitle: string;
  trustSubtitle: string;
  trustTitleSize: number;
  trustSubtitleSize: number;
  trustItems: Array<{ title: string; description: string }>;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaTitleSize: number;
  ctaSubtitleSize: number;
  footerBrand: string;
  footerDescription: string;
  footerCopyright: string;
  footerPaddingTop: number;
  footerPaddingBottom: number;
  footerMarginTop: number;
  footerMarginBottom: number;
};

export const LANDING_SETTINGS_KEY = "mejai_landing_settings_v1";

export const defaultLandingSettings: LandingSettings = {
  heroBadge: "모든 통화에 지능을",
  heroTitle: "Mejai",
  heroSubtitle:
    "인공지능이 당신의 전화 상담을 더 정확하고 빠르게 만듭니다.\n고객 경험은 좋아지고, 운영 비용은 내려갑니다.",
  primaryCta: "지금 시작하기",
  secondaryCta: "데모 보기",
  landingFontFamily: "Apple SD Gothic Neo",
  heroTitleSize: 160,
  heroSubtitleSize: 28,
  heroContentPaddingTop: 192,
  heroContentPaddingBottom: 0,
  heroContentMarginTop: 0,
  heroContentMarginBottom: 0,
  heroContentMaxWidth: 960,
  sectionsPaddingTop: 0,
  sectionsPaddingBottom: 0,
  sectionsMarginTop: 0,
  sectionsMarginBottom: 0,
  featuresEyebrow: "핵심 기능",
  featuresTitle: "전화 상담을 위한\n가장 정교한 자동화.",
  featuresSubtitle:
    "음성부터 상담 기록까지, 모든 흐름을 실시간으로 연결해\n상담 품질과 비용 효율을 동시에 끌어올립니다.",
  featuresTitleSize: 64,
  featuresSubtitleSize: 24,
  featuresCards: [
    { title: "실시간 음성 인식", description: "통화 품질이 낮아도 고객 발화를 정확하게 텍스트로 변환합니다." },
    { title: "인공지능 요약", description: "핵심만 남겨 즉시 리포트를 만듭니다." },
    { title: "RAG 지식 연결", description: "회사 지식과 정책을 실시간으로 불러 정확한 답변을 제공합니다." },
    { title: "강력한 데이터 보호", description: "민감한 고객 정보는 자동으로 마스킹되어 안전하게 보호됩니다." },
  ],
  processTitle: "음성에서 정보로,\n정보에서 자산으로 가는 8단계 프로세스",
  processSubtitle:
    "단순한 응답이 아니라, 고객 상담 전 과정을 지능화해\nMejai가 최고의 정확도로 처리합니다.",
  processTitleSize: 56,
  processSubtitleSize: 24,
  processSteps: [
    { id: "01", title: "고객 발화 수집", description: "고객 음성을 8kHz 음성 신호로 안정적으로 캡처합니다." },
    { id: "02", title: "실시간 ASR 전사", description: "발화 즉시 텍스트로 변환하고 실시간으로 기록합니다." },
    { id: "03", title: "의도 추출 및 요약", description: "발화에서 핵심 의도와 목적을 정확하게 추출합니다." },
    { id: "04", title: "상담 확인", description: "추출한 정보를 고객에게 재확인해 정확도를 높입니다." },
    { id: "05", title: "RAG 지식 검색", description: "회사 정책과 지식베이스에서 최적의 근거를 찾습니다." },
    { id: "06", title: "맞춤형 응답 생성", description: "Gemini, GPT, Claude가 자연스러운 답변을 제공합니다." },
    { id: "07", title: "성공률/만족도 측정", description: "응답 품질과 성과를 정밀하게 측정합니다." },
    { id: "08", title: "데이터 자산화", description: "모든 상담 데이터를 기업의 지식 자산으로 축적합니다." },
  ],
  comparisonTitle: "기존 방식과는\n비교할 수 없는 차이.",
  comparisonSubtitle: "비효율적인 상담 대기와 정보 불일치를 없애고\n실제 상담 경험을 개선합니다.",
  comparisonTitleSize: 72,
  comparisonSubtitleSize: 24,
  comparisonRows: [
    { feature: "응답 대기 시간", traditional: "평균 5~10분", ai: "0초(즉시 연결)" },
    { feature: "상담 가능 시간", traditional: "평일 09~18시", ai: "24시간 365일" },
    { feature: "상담 기록 정확도", traditional: "수동 기록(누락 위험)", ai: "100% 실시간 음성 전사" },
    { feature: "지식 참조", traditional: "상담사 기억에 의존", ai: "RAG 기반 실시간 정책 검색" },
    { feature: "운영 비용", traditional: "인건비 및 교육비 부담", ai: "기존 비용 최대 80% 절감" },
  ],
  consoleTitle: "모든 것을\n통합하는 대시보드.",
  consoleSubtitle:
    "상담 흐름의 모든 과정을 한눈에 분석하고\n실시간 지표를 모니터링하세요.\nMejai는 운영팀에 정확한 인사이트를 제공합니다.",
  consoleTitleSize: 56,
  consoleSubtitleSize: 24,
  consoleCards: [
    { title: "실시간 로그", description: "통화 단위 요약 및 상태" },
    { title: "성과 분석", description: "성공률과 만족도 통계" },
    { title: "지식 센터", description: "정책 및 FAQ 관리" },
    { title: "보안 감사", description: "데이터 접근 권한 관리" },
  ],
  trustTitle: "신뢰할 수 있는 데이터 관리와 보안",
  trustSubtitle: "고객과 기업의 정보를 안전하게 보호하는 것이 우리의 최우선입니다.",
  trustTitleSize: 36,
  trustSubtitleSize: 18,
  trustItems: [
    { title: "보안 가이드 준수", description: "금융 및 산업 보안 가이드라인을 준수하는 강력한 프로토콜을 사용합니다." },
    { title: "데이터 암호화", description: "모든 통화 기록과 텍스트 데이터는 저장과 전송 시 암호화됩니다." },
    { title: "개인정보 비식별화", description: "전화번호, 주소 등 민감한 개인정보는 자동으로 마스킹 처리됩니다." },
    { title: "투명한 감사 로그", description: "모든 데이터 접근과 설정 변경 이력을 감사 로그로 기록합니다." },
  ],
  ctaTitle: "상담의 미래를\n지금 체험하세요",
  ctaSubtitle: "무료 데모로 Mejai의 정교한 성능을\n직접 경험해 보세요.",
  ctaPrimary: "지금 시작하기",
  ctaSecondary: "전문가와 상담하기",
  ctaTitleSize: 96,
  ctaSubtitleSize: 28,
  footerBrand: "Mejai",
  footerDescription: "전화 상담의 전 과정을 자동화하고 지능화합니다.\n(주)메자이 | 대표자 홍길동\n서울특별시 강남구 테헤란로 123",
  footerCopyright: "© 2026 Mejai. 모든 권리 보유.",
  footerPaddingTop: 80,
  footerPaddingBottom: 80,
  footerMarginTop: 0,
  footerMarginBottom: 0,
};

export function loadLandingSettings(): LandingSettings {
  if (typeof window === "undefined") {
    return defaultLandingSettings;
  }
  try {
    const raw = window.localStorage.getItem(LANDING_SETTINGS_KEY);
    if (!raw) return defaultLandingSettings;
    const parsed = JSON.parse(raw) as Partial<LandingSettings>;
    return { ...defaultLandingSettings, ...parsed };
  } catch {
    return defaultLandingSettings;
  }
}

export function saveLandingSettings(settings: LandingSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANDING_SETTINGS_KEY, JSON.stringify(settings));
}
