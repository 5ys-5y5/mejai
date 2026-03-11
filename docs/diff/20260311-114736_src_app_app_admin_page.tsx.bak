"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { ChatSettingsPanel } from "@/components/settings/ChatSettingsPanel";
import { ProposalSettingsPanel } from "@/components/settings/ProposalSettingsPanel";
import { PerformanceSettingsPanel } from "@/components/settings/PerformanceSettingsPanel";
import { PolicySettingsPanel } from "@/components/settings/PolicySettingsPanel";
import { DesignSystemContent } from "@/app/app/design-system/page";
import { UnderlineTabs, type TabItem } from "@/components/design-system";

type TabKey = "chat" | "proposal" | "performance" | "design-system" | "policies";

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get("tab") || "chat").toLowerCase();
  const tab: TabKey =
    rawTab === "proposal" || rawTab === "performance" || rawTab === "design-system" || rawTab === "policies"
      ? (rawTab as TabKey)
      : "chat";

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReady, setAdminReady] = useState(false);
  const [authToken, setAuthToken] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.user) {
        setAdminReady(true);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        setAuthToken(sessionData.session.access_token);
      }
      const { data: access } = await supabase
        .from("A_iam_user_access_maps")
        .select("is_admin")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!mounted) return;
      setIsAdmin(Boolean(access?.is_admin));
      setAdminReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthToken(session?.access_token || "");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const tabs = useMemo<TabItem<TabKey>[]>(
    () => [
      { key: "chat", label: "대화 설정" },
      { key: "proposal", label: "제안" },
      { key: "performance", label: "성능" },
      { key: "policies", label: "Policies" },
      { key: "design-system", label: "디자인 시스템" },
    ],
    []
  );

  return (
    <div className="px-5 md:px-8 pt-6 pb-[100px]">
      <div className="mx-auto w-full max-w-6xl">
        <UnderlineTabs
          tabs={tabs}
          activeKey={tab}
          onSelect={(key) => router.push(`/app/admin?tab=${key}`)}
        />

        <div className="mt-6">
          {adminReady && !isAdmin ? (
            <Card className="p-4 text-sm text-slate-600">관리자 권한이 필요합니다.</Card>
          ) : tab === "chat" ? (
            <ChatSettingsPanel authToken={authToken} />
          ) : tab === "proposal" ? (
            <ProposalSettingsPanel authToken={authToken} />
          ) : tab === "design-system" ? (
            <DesignSystemContent />
          ) : tab === "policies" ? (
            <PolicySettingsPanel />
          ) : (
            <PerformanceSettingsPanel />
          )}
        </div>
      </div>
    </div>
  );
}
