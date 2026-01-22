"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ThumbsUp, ThumbsDown, AlertCircle, Phone, ArrowUpRight } from "lucide-react";

const trendData = [
  { name: "Mon", satisfied: 45, unsatisfied: 5, escalated: 8 },
  { name: "Tue", satisfied: 52, unsatisfied: 3, escalated: 6 },
  { name: "Wed", satisfied: 48, unsatisfied: 8, escalated: 12 },
  { name: "Thu", satisfied: 61, unsatisfied: 4, escalated: 7 },
  { name: "Fri", satisfied: 55, unsatisfied: 6, escalated: 9 },
  { name: "Sat", satisfied: 32, unsatisfied: 2, escalated: 4 },
  { name: "Sun", satisfied: 28, unsatisfied: 3, escalated: 3 },
];

const satisfactionData = [
  { name: "도움됨", value: 75, color: "hsl(var(--primary))" },
  { name: "도움안됨", value: 15, color: "#f87171" },
  { name: "평가없음", value: 10, color: "#e5e7eb" },
];

export default function Analytics() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <p className="text-sm opacity-80">주간 평균 해결률</p>
            <h3 className="text-3xl font-bold mt-2">86.2%</h3>
            <div className="flex items-center gap-1 mt-2 text-xs opacity-90">
              <ArrowUpRight className="w-3 h-3" /> 지난주 대비 3.4% 상승
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">주간 총 통화</p>
            <h3 className="text-3xl font-bold mt-2">1,248건</h3>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="w-3 h-3" /> 지난주 대비 12% 증가
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">평균 에스컬레이션률</p>
            <h3 className="text-3xl font-bold mt-2">7.4%</h3>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="w-3 h-3" /> 지난주 대비 1.2% 감소
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">주간 만족도 추이</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSatisfied" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="satisfied" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorSatisfied)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="unsatisfied" 
                  stroke="#f87171" 
                  fill="transparent" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">전체 만족도 분포</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={satisfactionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {satisfactionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
