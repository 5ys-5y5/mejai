"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Phone, Book, Settings, Building, ArrowRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "사업체 정보", icon: Building },
  { id: 2, title: "전화번호 연결", icon: Phone },
  { id: 3, title: "기본 지식 업로드", icon: Book },
  { id: 4, title: "정책 설정", icon: Settings },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.success("온보딩이 완료되었습니다!");
      router.push("/app");
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-accent/30 py-20 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between relative">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  currentStep >= step.id 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "bg-background border-muted text-muted-foreground"
                )}>
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-xs font-medium mt-2",
                  currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </div>
            ))}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0" />
            <div 
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 -z-0" 
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <Card className="shadow-xl border-none">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              {currentStep === 1 && "사업체의 기본 정보를 입력해 주세요."}
              {currentStep === 2 && "상담봇이 사용할 유선 전화번호를 연결합니다."}
              {currentStep === 3 && "AI가 답변의 근거로 사용할 가이드나 FAQ 문서를 업로드하세요."}
              {currentStep === 4 && "상담봇의 기본 정책과 데이터 보존 기간을 설정합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8 min-h-[300px]">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">사업체 공식 명칭</label>
                  <Input placeholder="(주) 메제이" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">사업자 등록번호</label>
                  <Input placeholder="000-00-00000" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">대표자 명</label>
                  <Input placeholder="홍길동" />
                </div>
              </div>
            )}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="p-6 border-2 border-dashed rounded-xl text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold">기존 번호 연결하기</p>
                    <p className="text-sm text-muted-foreground">Twilio, Telnyx 등 플랫폼의 번호를 입력하세요.</p>
                  </div>
                  <Input placeholder="+82 02-1234-5678" className="max-w-xs mx-auto text-center" />
                  <Button variant="outline" size="sm">연결 테스트</Button>
                </div>
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">또는</span>
                </div>
                <Button variant="ghost" className="w-full border">새 번호 발급 요청하기</Button>
              </div>
            )}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-xl hover:border-primary cursor-pointer transition-colors space-y-2">
                    <div className="font-bold">FAQ 문서</div>
                    <p className="text-xs text-muted-foreground">질의응답 형식의 엑셀 또는 CSV</p>
                  </div>
                  <div className="p-4 border rounded-xl hover:border-primary cursor-pointer transition-colors space-y-2">
                    <div className="font-bold">CS 가이드</div>
                    <p className="text-xs text-muted-foreground">PDF 또는 워드 형식의 가이드북</p>
                  </div>
                </div>
                <div className="p-12 border-2 border-dashed rounded-xl text-center">
                  <Book className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium">파일을 드래그하여 업로드하거나 클릭하세요</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX 지원 (최대 10MB)</p>
                </div>
              </div>
            )}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-xl">
                    <div>
                      <p className="font-bold">데이터 보존 기간</p>
                      <p className="text-xs text-muted-foreground">녹취 및 전사 텍스트 저장 기간</p>
                    </div>
                    <select className="bg-transparent text-sm font-medium outline-none">
                      <option>30일</option>
                      <option>90일</option>
                      <option>1년</option>
                      <option>무제한</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-xl">
                    <div>
                      <p className="font-bold">개인정보 마스킹</p>
                      <p className="text-xs text-muted-foreground">전화번호, 주소 등 자동 비식별화</p>
                    </div>
                    <div className="w-10 h-5 bg-primary rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">기본 인사말</label>
                    <Input defaultValue="안녕하세요. AI 상담봇 메제이입니다. 무엇을 도와드릴까요?" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t py-6">
            <Button 
              variant="ghost" 
              onClick={prevStep} 
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> 이전
            </Button>
            <Button onClick={nextStep}>
              {currentStep === 4 ? "완료" : "다음"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
