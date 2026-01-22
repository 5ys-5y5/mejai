"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
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

  return (
    <div className="min-h-screen bg-accent/10 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">인터랙티브 데모</h1>
          <p className="text-lg text-muted-foreground">
            인공지능 상담봇이 실제 통화를 처리하는 과정을 단계별로 확인하세요.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <Card className="lg:col-span-3 border-none shadow-xl overflow-hidden min-h-[500px] flex flex-col">
            <CardHeader className="bg-primary text-primary-foreground py-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Phone className="w-4 h-4 fill-white" />
                </div>
                <span className="font-bold text-sm">실시간 통화 시뮬레이션</span>
              </div>
              <div className="text-[10px] bg-black/20 px-2 py-1 rounded">00:15 / 00:45</div>
            </CardHeader>
            <CardContent className="flex-1 p-6 space-y-6 overflow-y-auto">
              {demoSteps.slice(0, currentStep + 1).map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
                    step.role === "user" ? "flex-row" : "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                      step.role === "user"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {step.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed max-w-[80%] shadow-sm",
                      step.role === "user"
                        ? "bg-accent/50 rounded-tl-none border"
                        : "bg-primary/5 border border-primary/20 rounded-tr-none"
                    )}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-50">
                      {step.title}
                    </div>
                    <p className="whitespace-pre-wrap">{step.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-6 border-t bg-muted/20 flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset} disabled={currentStep === 0}>
                  <RotateCcw className="w-4 h-4 mr-2" /> 초기화
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStep === 0}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> 이전
                </Button>
                <Button size="sm" onClick={nextStep} disabled={currentStep === demoSteps.length - 1}>
                  다음 단계 <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" /> 처리 로직 설명
            </h3>
            <div className="space-y-4">
              {demoSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300",
                    currentStep === index
                      ? "bg-background shadow-lg border-primary border-l-4 translate-x-2"
                      : "bg-muted/30 opacity-40 grayscale"
                  )}
                >
                  <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              ))}
            </div>

            {currentStep === demoSteps.length - 1 && (
              <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20 animate-in zoom-in-95">
                <h4 className="font-bold mb-2">시뮬레이션 완료!</h4>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  이제 실제 서비스에 적용해 상담 품질을 높여보세요.
                </p>
                <Link href="/signup">
                  <Button className="w-full h-11 text-xs">
                    지금 바로 시작하기 <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
