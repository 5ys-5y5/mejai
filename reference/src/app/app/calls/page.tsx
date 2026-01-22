"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  MessageSquare,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const calls = [
  { id: "S-1024", date: "2026-01-21", time: "14:20:05", phone: "010-****-1234", category: "주문/배송", satisfaction: "도움됨", escalated: false, duration: "1:45" },
  { id: "S-1023", date: "2026-01-21", time: "14:15:30", phone: "010-****-5678", category: "반품/교환", satisfaction: "도움안됨", escalated: true, duration: "3:20" },
  { id: "S-1022", date: "2026-01-21", time: "14:02:12", phone: "010-****-9012", category: "결제 오류", satisfaction: "-", escalated: true, duration: "0:50" },
  { id: "S-1021", date: "2026-01-21", time: "13:45:00", phone: "010-****-3456", category: "회원 정보", satisfaction: "도움됨", escalated: false, duration: "2:10" },
  { id: "S-1020", date: "2026-01-21", time: "13:22:45", phone: "010-****-7890", category: "주문/배송", satisfaction: "도움됨", escalated: false, duration: "1:15" },
  { id: "S-1019", date: "2026-01-21", time: "12:55:10", phone: "010-****-2345", category: "기타", satisfaction: "-", escalated: false, duration: "4:05" },
  { id: "S-1018", date: "2026-01-21", time: "12:30:00", phone: "010-****-6789", category: "주문/배송", satisfaction: "도움됨", escalated: false, duration: "2:30" },
  { id: "S-1017", date: "2026-01-21", time: "11:15:20", phone: "010-****-0123", category: "반품/교환", satisfaction: "도움안됨", escalated: false, duration: "5:10" },
];

export default function CallLogs() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="세션 ID 또는 전화번호 검색" className="pl-10" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" /> 필터
          </Button>
          <Button variant="outline" size="sm">오늘</Button>
          <Button variant="outline" size="sm">어제</Button>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left bg-muted/30">
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">세션 정보</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">발신번호</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">카테고리</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-center">만족도</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-center">에스컬레이션</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-accent/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">{call.id}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{call.date} {call.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{call.phone}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-accent rounded text-[11px] font-medium">{call.category}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {call.satisfaction === "도움됨" && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <MessageSquare className="w-3 h-3" /> 도움됨
                        </span>
                      )}
                      {call.satisfaction === "도움안됨" && (
                        <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                          <MessageSquare className="w-3 h-3" /> 도움안됨
                        </span>
                      )}
                      {call.satisfaction === "-" && <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {call.escalated ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[11px] font-bold uppercase tracking-tighter">Required</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/app/calls/${call.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs">
                          상세보기 <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">전체 1,024건 중 1-8건 표시</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" disabled className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 bg-primary text-primary-foreground">1</Button>
          <Button variant="outline" size="sm" className="h-8">2</Button>
          <Button variant="outline" size="sm" className="h-8">3</Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
