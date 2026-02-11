"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Phone,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Bot,
  User,
  Database,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const demoSteps = [
  {
    id: 1,
    title: "고객 발화",
    role: "user",
    message: "안녕하세요. 이번에 주문한 물건 배송이 언제 시작되나요?",
    detail: "시스템이 음성을 실시간으로 수집합니다.",
  },
  {
    id: 2,
    title: "ASR 전사",
    role: "ai",
    message:
      "고객 목적: 주문 배송 시작 시점 문의\n핵심 키워드: 주문, 배송 시작",
    detail: "음성을 텍스트로 변환하고 핵심 키워드를 추출합니다.",
  },
  {
    id: 3,
    title: "내용 확인 (재확인)",
    role: "ai",
    message:
      "주문하신 상품의 배송 시작 시점을 확인해 드릴까요? 맞다면 '네'라고 말씀해 주세요.",
    detail: "인공지능이 이해한 내용이 맞는지 고객에게 확인합니다.",
  },
  {
    id: 4,
    title: "고객 확인",
    role: "user",
    message: "네 맞아요.",
    detail: "고객의 긍정/부정을 분석합니다.",
  },
  {
    id: 5,
    title: "RAG 답변 생성",
    role: "ai",
    message:
      "확인 감사합니다. 주문하신 상품은 오늘 오후 4시에 출고 예정이며, 보통 내일 중 수령하실 수 있습니다.",
    detail: "지식베이스에서 최신 정보를 검색해 답변을 생성합니다.",
  },
  {
    id: 6,
    title: "만족도 확인",
    role: "ai",
    message:
      "도움이 되셨나요? 만족하시면 1번, 아니면 2번을 말씀해 주세요.",
    detail: "상담 품질을 정량적으로 측정합니다.",
  },
];

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const reset = () => {
    setCurrentStep(0);
  };

  function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
      <div className={cn("rounded-2xl border border-slate-200 bg-white", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-400">
            Demo
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            인터랙티브 상담 흐름
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl">
            Mejai가 통화 흐름을 어떻게 분석하고 응답을 생성하는지 단계별로 확인하세요.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <CardShell className="flex min-h-[520px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <Phone className="h-4 w-4 text-slate-700" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">실시간 통화 시뮬레이션</div>
                  <div className="text-xs text-slate-500">자동 요약/확인/응답 흐름</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">00:15 / 00:45</div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {demoSteps.slice(0, currentStep + 1).map((step, index, list) => {
                const prev = list[index - 1];
                const isGrouped = prev?.role === step.role;
                const rowGap = "gap-4";
                const rowSpacing = index === 0 ? "" : isGrouped ? "mt-1" : "mt-3";
                const showAvatar = !isGrouped;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex animate-in fade-in slide-in-from-bottom-2 duration-500",
                      rowGap,
                      rowSpacing,
                      step.role === "user" ? "flex-row" : "flex-row-reverse"
                    )}
                  >
                    {showAvatar ? (
                      <div
                        className={cn(
                          "mt-1 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700",
                          step.role === "user" ? "" : "bg-slate-900 text-white border-slate-900"
                        )}
                      >
                        {step.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                    ) : (
                      <div
                        className="mt-1 h-8 w-8 shrink-0 rounded-xl border border-slate-200 bg-white opacity-0"
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                        step.role === "user"
                          ? "bg-slate-50 border-slate-200"
                          : "bg-white border-slate-200"
                      )}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
                        {step.title}
                      </div>
                      <p className="whitespace-pre-wrap text-slate-800">{step.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <Button variant="outline" size="sm" onClick={reset} disabled={currentStep === 0}>
                <RotateCcw className="mr-2 h-4 w-4" /> 초기화
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStep === 0}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> 이전
                </Button>
                <Button size="sm" onClick={nextStep} disabled={currentStep === demoSteps.length - 1}>
                  다음 단계 <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardShell>

          <CardShell className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-slate-600" /> 처리 로직 설명
            </div>
            <div className="space-y-3">
              {demoSteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    currentStep === index
                      ? "border-slate-400 bg-white"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  <div className="text-xs font-semibold text-slate-700">{step.title}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{step.detail}</div>
                </button>
              ))}
            </div>

            {currentStep === demoSteps.length - 1 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">시뮬레이션 완료</div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  실제 서비스로 이어서 설정을 진행해 보세요.
                </p>
                <Link href="/login">
                  <Button className="mt-4 w-full h-10 text-xs">
                    지금 바로 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardShell>
        </div>
      </div>
    </div>
  );
}
