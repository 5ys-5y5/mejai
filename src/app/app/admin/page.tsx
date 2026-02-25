"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { ProposalSettingsPanel } from "@/components/settings/ProposalSettingsPanel";
import { ChatSettingsPanelCore } from "@/components/settings/ChatSettingsPanelCore";
import { ChatSettingsPanelEnv } from "@/components/settings/ChatSettingsPanelEnv";
import { ChatSettingsPanelMapping } from "@/components/settings/ChatSettingsPanelMapping";
import { PerformanceSettingsPanel } from "@/components/settings/PerformanceSettingsPanel";
import { PolicySettingsPanel } from "@/components/settings/PolicySettingsPanel";
import { DesignSystemContent } from "@/app/app/design-system/page";
import { UnderlineTabs, type TabItem } from "@/components/design-system";

type TabKey = "chat" | "env" | "mapping" | "proposal" | "performance" | "design-system" | "policies";
type TabVisibility = "public" | "user" | "admin";
type AdminTabItem = TabItem<TabKey> & { visibility: TabVisibility };

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get("tab") || "chat").toLowerCase();
  const tab: TabKey =
    rawTab === "proposal" ||
    rawTab === "performance" ||
    rawTab === "design-system" ||
    rawTab === "policies" ||
    rawTab === "env" ||
    rawTab === "mapping"
      ? (rawTab as TabKey)
      : "chat";

  const [accessRole, setAccessRole] = useState<TabVisibility>("public");
  const [accessReady, setAccessReady] = useState(false);
  const [authToken, setAuthToken] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAccessRole("public");
      setAccessReady(true);
      return () => {};
    }

    const resolveAccess = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        setAccessRole("public");
        setAccessReady(true);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        setAuthToken(sessionData.session.access_token);
      }
      const { data: access } = await supabase
        .from("A_iam_user_profiles")
        .select("is_admin")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (access?.is_admin) {
        setAccessRole("admin");
      } else if (access) {
        setAccessRole("user");
      } else {
        setAccessRole("public");
      }
      setAccessReady(true);
    };

    void resolveAccess();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthToken(session?.access_token || "");
      void resolveAccess();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const tabs = useMemo<AdminTabItem[]>(
    () => [
      { key: "chat", label: "\ub300\ud654 \uc124\uc815", visibility: "user" },
      { key: "env", label: "\ub7f0\ud0c0\uc784 \ud658\uacbd \ubcc0\uc218", visibility: "admin" },
      { key: "mapping", label: "\uc124\uc815-\ud30c\uc77c \ub9e4\ud551", visibility: "admin" },
      { key: "proposal", label: "\uc81c\uc548", visibility: "user" },
      { key: "performance", label: "\uc131\ub2a5", visibility: "user" },
      { key: "policies", label: "Policies", visibility: "admin" },
      { key: "design-system", label: "\ub514\uc790\uc778 \uc2dc\uc2a4\ud15c", visibility: "public" },
    ],
    []
  );

  const canView = (visibility: TabVisibility) =>
    visibility === "public" || accessRole === "admin" || (accessRole === "user" && visibility === "user");
  const visibleTabs = useMemo(() => tabs.filter((item) => canView(item.visibility)), [accessRole, tabs]);
  const activeTab = useMemo(() => {
    if (visibleTabs.some((item) => item.key === tab)) return tab;
    return visibleTabs[0]?.key ?? "design-system";
  }, [tab, visibleTabs]);

  useEffect(() => {
    if (!accessReady) return;
    if (visibleTabs.some((item) => item.key === tab)) return;
    const fallback = visibleTabs[0]?.key;
    if (fallback) {
      router.replace(`/app/admin?tab=${fallback}`);
    }
  }, [accessReady, router, tab, visibleTabs]);

  return (
    <div className="px-5 md:px-8 pt-6 pb-[100px]">
      <div className="mx-auto w-full max-w-6xl">
        <UnderlineTabs
          tabs={visibleTabs}
          activeKey={activeTab}
          onSelect={(key) => router.push(`/app/admin?tab=${key}`)}
        />

        <div className="mt-6">
          {!accessReady ? null : !visibleTabs.some((item) => item.key === activeTab) ? (
            <Card className="p-4 text-sm text-slate-600">{"\uC774 \ud56D\ubaa9\uc740 \uAD8C\ud55C\uc774 \ud544\uc694\ud569\ub2c8\ub2e4."}</Card>
          ) : activeTab === "chat" ? (
            <ChatSettingsPanelCore authToken={authToken} />
          ) : activeTab === "env" ? (
            <ChatSettingsPanelEnv authToken={authToken} />
          ) : activeTab === "mapping" ? (
            <ChatSettingsPanelMapping authToken={authToken} />
          ) : activeTab === "proposal" ? (
            <ProposalSettingsPanel authToken={authToken} />
          ) : activeTab === "design-system" ? (
            <DesignSystemContent />
          ) : activeTab === "policies" ? (
            <PolicySettingsPanel />
          ) : (
            <PerformanceSettingsPanel />
          )}
        </div>
      </div>
    </div>
  );
}
