"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-accent/30 px-4">
      <Card className="w-full max-w-md shadow-xl border-none text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">이메일 인증</CardTitle>
          <CardDescription>
            입력하신 이메일로 인증 링크가 전송되었습니다. <br />
            이메일을 확인하여 가입을 완료해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            이메일을 받지 못하셨나요? 스팸함을 확인하거나 
            <button className="text-primary hover:underline ml-1">재발송</button>을 요청하세요.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/onboarding" className="w-full">
            <Button className="w-full">
              인증 완료 후 다음 단계로 <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
