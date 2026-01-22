"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        toast.success("로그인 성공!");
        router.push("/app");
      }
    } catch (error: any) {
      toast.error("로그인 실패: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <Card className="w-full max-w-md border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-10">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">환영합니다</CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            운영자 계정으로 로그인하여 서비스를 관리하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
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
              {isLoading ? <Loader2 className="animate-spin" /> : "로그인"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
            <p className="text-sm text-zinc-500 font-medium">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="text-black font-bold hover:underline">
                지금 가입하기
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
