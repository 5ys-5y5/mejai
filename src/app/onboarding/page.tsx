"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  Check,
  Phone,
  Book,
  Settings,
  Building,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabaseClient";

const steps = [
  { id: 1, title: "사업체 정보", icon: Building },
  { id: 2, title: "전화번호 연결", icon: Phone },
  { id: 3, title: "기본 지식 업로드", icon: Book },
  { id: 4, title: "정책 설정", icon: Settings },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [existingOrg, setExistingOrg] = useState<{
    id: string;
    name: string;
    owner_id: string;
    business_registration_number: string | null;
  } | null>(null);
  const [isCheckingOrg, setIsCheckingOrg] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);
  const router = useRouter();

  const normalizedBusinessNumber = useMemo(
    () => businessNumber.replace(/\D/g, "").slice(0, 10),
    [businessNumber]
  );

  const formattedBusinessNumber = useMemo(() => {
    const digits = normalizedBusinessNumber;
    if (!digits) return "";
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 5);
    const part3 = digits.slice(5, 10);
    return [part1, part2, part3].filter(Boolean).join("-");
  }, [normalizedBusinessNumber]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user?.email) return;
      setOwnerName(data.user.email.split("@")[0]);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (normalizedBusinessNumber.length !== 10) {
      return;
    }
    let cancelled = false;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    const timer = setTimeout(async () => {
      setIsCheckingOrg(true);
      const { data, error } = await supabase
        .from("A_iam_organizations")
        .select("id, name, owner_id, business_registration_number")
        .eq("business_registration_number", normalizedBusinessNumber)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setExistingOrg(null);
        setNameLocked(false);
        setIsCheckingOrg(false);
        return;
      }

      if (data) {
        setExistingOrg(data);
        setNameLocked(true);
        if (!orgName.trim() || orgName.trim() !== data.name) {
          setOrgName(data.name);
          toast.info("해당 사업자 등록번호로 등록된 사업체 공식 명칭으로 자동 정정했습니다.");
        }
      } else {
        setExistingOrg(null);
        setNameLocked(false);
      }
      setIsCheckingOrg(false);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedBusinessNumber, orgName]);

  const nextStep = async () => {
    if (currentStep === 1) {
      if (!orgName.trim()) {
        toast.error("사업체 공식 명칭을 입력해 주세요.");
        return;
      }
      if (normalizedBusinessNumber.length !== 10) {
        toast.error("사업자 등록번호를 정확히 입력해 주세요.");
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      return;
    }

    if (!orgName.trim()) {
      toast.error("사업체 공식 명칭을 입력해 주세요.");
      setCurrentStep(1);
      return;
    }
    if (normalizedBusinessNumber.length !== 10) {
      toast.error("사업자 등록번호를 정확히 입력해 주세요.");
      setCurrentStep(1);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      toast.error("Supabase 설정이 필요합니다.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      toast.error("로그인 상태를 확인해주세요.");
      return;
    }

    if (existingOrg) {
      if (orgName.trim() !== existingOrg.name) {
        setOrgName(existingOrg.name);
        toast.error("기존에 등록된 사업체 공식 명칭과 일치해야 합니다.");
        setCurrentStep(1);
        return;
      }

      if (existingOrg.owner_id !== userData.user.id) {
        const { error: updateError } = await supabase
          .from("A_iam_organizations")
          .update({ registrant_id: userData.user.id })
          .eq("id", existingOrg.id);

        if (updateError) {
          toast.error(updateError.message || "등록자 정보 업데이트에 실패했습니다.");
          return;
        }

        const { error: accessError } = await supabase.from("A_iam_user_access_maps").upsert({
          user_id: userData.user.id,
          org_id: existingOrg.id,
          plan: "starter",
          is_admin: false,
          org_role: "pending",
        });
        if (accessError) {
          toast.error(accessError.message || "승인 요청 생성에 실패했습니다.");
          return;
        }

        toast.success("승인 요청이 접수되었습니다. 소유자 승인 후 이용할 수 있습니다.");
        router.push("/app");
        return;
      }

      const { error: accessError } = await supabase.from("A_iam_user_access_maps").upsert({
        user_id: userData.user.id,
        org_id: existingOrg.id,
        plan: "starter",
        is_admin: true,
        org_role: "owner",
      });
      if (accessError) {
        toast.error(accessError.message || "사용자 권한 생성에 실패했습니다.");
        return;
      }

      toast.success("온보딩이 완료되었습니다.");
      router.push("/app");
      return;
    }

    const { data: orgData, error: orgError } = await supabase
      .from("A_iam_organizations")
      .insert({
        name: orgName.trim(),
        owner_id: userData.user.id,
        registrant_id: userData.user.id,
        business_registration_number: normalizedBusinessNumber,
      })
      .select("id")
      .single();

    if (orgError) {
      toast.error(orgError.message || "조직 생성에 실패했습니다.");
      return;
    }

    if (orgData?.id) {
      const { error: accessError } = await supabase.from("A_iam_user_access_maps").upsert({
        user_id: userData.user.id,
        org_id: orgData.id,
        plan: "starter",
        is_admin: true,
        org_role: "owner",
      });
      if (accessError) {
        toast.error(accessError.message || "사용자 권한 생성에 실패했습니다.");
        return;
      }
    }

    toast.success("온보딩이 완료되었습니다.");
    router.push("/app");
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-accent/30 py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <div className="flex justify-between relative">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center z-10">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    currentStep >= step.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium mt-2",
                    currentStep >= step.id
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>
            ))}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 -z-0"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        <Card className="border-none">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              {currentStep === 1 && "사업체의 기본 정보를 입력해 주세요."}
              {currentStep === 2 && "상담봇이 사용할 전화번호를 연결합니다."}
              {currentStep === 3 && "인공지능이 참고할 가이드와 FAQ 문서를 업로드하세요."}
              {currentStep === 4 && "상담 정책과 개인정보 보호 기준을 설정합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8 min-h-[300px]">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">사업체 공식 명칭</label>
                  <Input
                    placeholder="(주) 메자이"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    readOnly={nameLocked}
                  />
                  {nameLocked ? (
                    <p className="text-xs text-muted-foreground">
                      해당 사업자 등록번호로 등록된 명칭이 자동 적용됩니다.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">사업자 등록번호</label>
                  <Input
                    placeholder="000-00-00000"
                    value={formattedBusinessNumber}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setBusinessNumber(nextValue);
                      const normalizedNext = nextValue.replace(/\D/g, "").slice(0, 10);
                      if (normalizedNext.length !== 10) {
                        setExistingOrg(null);
                        setNameLocked(false);
                        setIsCheckingOrg(false);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isCheckingOrg ? (
                      <span>기존 등록 여부 확인 중...</span>
                    ) : existingOrg ? (
                      <span>기존 사업체가 확인되었습니다. 소유자 승인 후 이용할 수 있습니다.</span>
                    ) : (
                      <span>사업자 등록번호는 10자리 숫자입니다.</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">관리자 이름</label>
                  <Input
                    placeholder="홍길동"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
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
                    <p className="text-sm text-muted-foreground">
                      Twilio, Telnyx 등의 번호를 입력해 주세요.
                    </p>
                  </div>
                  <Input placeholder="+82 02-1234-5678" className="max-w-xs mx-auto text-center" />
                  <Button variant="outline" size="sm">
                    연결 테스트
                  </Button>
                </div>
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">또는</span>
                </div>
                <Button variant="ghost" className="w-full border">
                  신규 번호 발급 요청하기
                </Button>
              </div>
            )}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-xl hover:border-primary cursor-pointer transition-colors space-y-2">
                    <div className="font-bold">FAQ 문서</div>
                    <p className="text-xs text-muted-foreground">
                      질문/답변 양식 또는 CSV
                    </p>
                  </div>
                  <div className="p-4 border rounded-xl hover:border-primary cursor-pointer transition-colors space-y-2">
                    <div className="font-bold">CS 가이드</div>
                    <p className="text-xs text-muted-foreground">PDF 또는 워드 양식</p>
                  </div>
                </div>
                <div className="p-12 border-2 border-dashed rounded-xl text-center">
                  <Book className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium">파일을 드래그하거나 클릭하세요.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOCX, XLSX 지원 (최대 10MB)
                  </p>
                </div>
              </div>
            )}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-xl">
                    <div>
                      <p className="font-bold">데이터 보관 기간</p>
                      <p className="text-xs text-muted-foreground">
                        음성 및 텍스트 데이터 저장 기간
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        전화번호, 주소 등 자동 비식별화
                      </p>
                    </div>
                    <div className="w-10 h-5 bg-primary rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">기본 인사말</label>
                    <Input defaultValue="안녕하세요. 인공지능 상담봇 메자이입니다. 무엇을 도와드릴까요?" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t py-6">
            <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1}>
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
