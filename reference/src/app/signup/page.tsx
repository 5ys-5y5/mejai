"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    orgName: "",
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Supabase Auth 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. 가입 성공 시 organizations 테이블에 회사 생성
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert([{ name: formData.orgName }])
          .select()
          .single();

        if (orgError) throw orgError;

        toast.success("회원 가입 성공! 이메일을 확인해 주세요.");
        router.push("/verify");
      }
    } catch (error: any) {
      toast.error("가입 실패: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <Card className="w-full max-w-md border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-8">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">시작하기</CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            mejai.help와 함께 전화 상담의 미래를 경험하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">회사명</label>
              <Input 
                placeholder="(주) 메제이헬프" 
                className="h-14 rounded-2xl bg-zinc-100 border-none font-medium"
                value={formData.orgName}
                onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">이메일 주소</label>
              <Input 
                type="email" 
                placeholder="name@company.com" 
                className="h-14 rounded-2xl bg-zinc-100 border-none font-medium"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">비밀번호</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="h-14 rounded-2xl bg-zinc-100 border-none font-medium"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            <Button className="w-full h-14 rounded-2xl bg-black text-white font-bold text-lg hover:bg-zinc-800 transition-all" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : "계정 생성하기"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
            <p className="text-sm text-zinc-500 font-medium">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-black font-bold hover:underline">
                로그인
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
