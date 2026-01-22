"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreHorizontal,
  BadgeCheck
} from "lucide-react";

const teamMembers = [
  { name: "홍길동", email: "admin@mejai.help", role: "Admin", status: "Active" },
  { name: "김철수", email: "qa1@mejai.help", role: "QA/Editor", status: "Active" },
  { name: "이영희", email: "agent1@mejai.help", role: "Agent", status: "Active" },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">팀 관리</h2>
          <p className="text-sm text-muted-foreground">사업체 팀원을 초대하고 권한을 관리합니다.</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" /> 팀원 초대
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left bg-muted/30">
                <th className="px-6 py-4 font-medium">이름</th>
                <th className="px-6 py-4 font-medium">역할</th>
                <th className="px-6 py-4 font-medium text-center">상태</th>
                <th className="px-6 py-4 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {teamMembers.map((member) => (
                <tr key={member.email} className="hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                        {member.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold">{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {member.role === "Admin" && <BadgeCheck className="w-4 h-4 text-primary" />}
                      <span className="text-xs font-medium">{member.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
