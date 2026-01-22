"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  Bell, 
  Shield, 
  Clock, 
  EyeOff, 
  MessageSquare,
  Smartphone,
  Phone
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        <h3 className="text-lg font-bold">상담봇 기본 설정</h3>
        <div className="grid gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">봇 이름</label>
                <Input defaultValue="메제이 AI" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">기본 인사말</label>
                <textarea className="w-full min-h-[100px] p-3 rounded-md border bg-transparent text-sm" defaultValue="안녕하세요. AI 상담봇 메제이입니다. 무엇을 도와드릴까요?" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold">데이터 및 보안</h3>
        <div className="grid gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-0 divide-y">
              <div className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <Clock className="w-4 h-4 text-primary" /> 데이터 보존 기간
                  </div>
                  <p className="text-xs text-muted-foreground">녹취 및 전사 데이터가 저장되는 기간입니다.</p>
                </div>
                <select className="bg-muted px-3 py-1.5 rounded-md text-sm outline-none">
                  <option>30일</option>
                  <option>90일</option>
                  <option>1년</option>
                  <option>무제한</option>
                </select>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <EyeOff className="w-4 h-4 text-primary" /> 개인정보 자동 마스킹
                  </div>
                  <p className="text-xs text-muted-foreground">전화번호, 주소 등 민감 정보를 자동으로 가립니다.</p>
                </div>
                <div className="w-10 h-5 bg-primary rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <Smartphone className="w-4 h-4 text-primary" /> 웹 입력 보조 활성화
                  </div>
                  <p className="text-xs text-muted-foreground">ASR 불안정 시 고객에게 웹 입력 링크를 전송합니다.</p>
                </div>
                <div className="w-10 h-5 bg-primary rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button variant="outline">초기화</Button>
        <Button>설정 저장</Button>
      </div>
    </div>
  );
}
