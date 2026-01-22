"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  FileText, 
  Search, 
  MoreVertical, 
  RefreshCw,
  Clock,
  Loader2,
  X,
  Database,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploadInProgress] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", category: "일반", content: "" });

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. 유저 정보 가져오기 (getUser가 더 정확함)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error("로그인이 필요합니다.");
        setIsLoading(false);
        return;
      }

      // 2. 해당 유저가 소유한 조직(Organization) 조회 (가장 최근 것 하나만)
      const { data: orgs, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (orgError) throw orgError;

      if (!orgs || orgs.length === 0) {
        toast.error("등록된 회사 정보가 없습니다. 다시 가입해 주세요.");
        setIsLoading(false);
        return;
      }

      const org = orgs[0];
      setOrgId(org.id);

      // 3. 지식 목록 가져오기
      const { data: kbData, error: kbError } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false });

      if (kbError) throw kbError;
      setDocuments(kbData || []);
    } catch (error: any) {
      console.error("Critical Load Error:", error);
      toast.error("데이터 로드 중 오류: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("조직 인증 정보가 유효하지 않습니다. 페이지를 새로고침해 주세요.");
      return;
    }
    
    setIsUploadInProgress(true);
    try {
      const response = await fetch("/api/kb/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ...newDoc }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success("지식이 성공적으로 학습되었습니다.");
      setIsUploadModalOpen(false);
      setNewDoc({ title: "", category: "일반", content: "" });
      loadAllData(); 
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploadInProgress(false);
    }
  };

  return (
    <div className="space-y-12 pb-24 max-w-[1200px] mx-auto pt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-sharp">지식 베이스</h1>
          <p className="text-zinc-500 text-lg font-medium">AI의 상담 근거가 되는 지식 데이터 관리</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full h-12 px-6 font-bold" onClick={loadAllData} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} /> 새로고침
          </Button>
          <Button className="rounded-full h-12 px-6 font-bold bg-black text-white hover:bg-zinc-800" onClick={() => setIsUploadModalOpen(true)}>
            <Plus className="w-5 h-5 mr-2" /> 새 지식 추가
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-300">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="font-medium tracking-tight">데이터 인증 및 동기화 중...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-sharp">
          <AnimatePresence>
            {documents.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 rounded-[3rem]">
                <p className="text-zinc-400 font-medium">아직 등록된 지식이 없습니다.</p>
              </div>
            ) : (
              documents.map((doc, i) => (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-none bg-zinc-50/50 hover:bg-zinc-50 transition-all rounded-[2rem] p-8 group overflow-hidden relative h-full flex flex-col justify-between">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                          <FileText className="w-6 h-6 text-zinc-900" />
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </div>
                      <div className="mb-8">
                        <h3 className="text-xl font-bold tracking-tight mb-2 line-clamp-2">{doc.title}</h3>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100">{doc.category}</span>
                          <span className="px-3 py-1 bg-emerald-50 rounded-full text-[10px] font-bold text-emerald-600 uppercase tracking-wider">학습 완료</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-6 border-t border-zinc-100/50 mt-auto">
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(doc.created_at).toLocaleDateString()}</div>
                      <Button variant="ghost" className="h-8 px-4 text-zinc-900 font-bold gap-2 hover:bg-white rounded-full transition-all">상세보기 <ArrowRight className="w-3 h-3" /></Button>
                    </div>
                    <Database className="absolute -right-10 -bottom-10 w-40 h-40 text-black/[0.02] -z-0" />
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsUploadModalOpen(true)}
            className="border-2 border-dashed border-zinc-100 bg-transparent rounded-[2rem] p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-zinc-200 cursor-pointer transition-all group min-h-[300px]"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors">
              <Plus className="w-8 h-8 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
            </div>
            <div>
              <p className="font-bold text-lg text-zinc-900">새로운 지식 학습</p>
              <p className="text-sm text-zinc-500 font-medium mt-1 text-sharp">AI에게 상담 근거를 가르쳐주세요.</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-sharp">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadModalOpen(false)} className="absolute inset-0 bg-white/80 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3rem] border border-zinc-100 overflow-hidden">
              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-bold tracking-tight">지식 추가 및 학습</h2>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsUploadModalOpen(false)}><X className="w-6 h-6" /></Button>
                </div>
                <form onSubmit={handleUpload} className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">제목</label>
                      <Input placeholder="예: 환불 규정 v1.2" value={newDoc.title} onChange={(e) => setNewDoc({...newDoc, title: e.target.value})} className="h-14 rounded-2xl bg-zinc-50 border-none font-medium" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">카테고리</label>
                      <Input placeholder="예: 배송, 보안, FAQ" value={newDoc.category} onChange={(e) => setNewDoc({...newDoc, category: e.target.value})} className="h-14 rounded-2xl bg-zinc-50 border-none font-medium" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">상세 내용</label>
                    <textarea className="w-full min-h-[300px] p-6 rounded-[2rem] bg-zinc-50 border-none text-base leading-relaxed outline-none focus:ring-1 focus:ring-zinc-200 transition-all font-medium" placeholder="AI가 상담 시 참고할 원문 데이터를 입력하세요." value={newDoc.content} onChange={(e) => setNewDoc({...newDoc, content: e.target.value})} required />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Button variant="ghost" type="button" className="flex-1 h-16 rounded-2xl font-bold text-zinc-500" onClick={() => !isUploading && setIsUploadModalOpen(false)} disabled={isUploading}>취소</Button>
                    <Button type="submit" disabled={isUploading} className="flex-[2] h-16 rounded-2xl font-bold bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200">
                      {isUploading ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" /> AI가 지식을 분석하여 벡터화 중입니다...
                        </span>
                      ) : "지식 학습 및 저장"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
