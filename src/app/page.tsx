"use client";

import { Loader2 } from "lucide-react";
import { Features } from "@/components/landing/features";
import { Process } from "@/components/landing/process";
import { Comparison } from "@/components/landing/comparison";
import { Trust } from "@/components/landing/trust";
import { ConsolePreview } from "@/components/landing/console-preview";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { MatrixRainBackground } from "@/components/landing/matrix-rain-background";
import {
  createConversationModelLegos,
  ConversationModelChatColumnLego,
  ConversationModelSetupColumnLego,
} from "@/components/design-system";
import { loadLandingSettings, type LandingSettings } from "@/lib/landingSettings";
import { useConversationPageController } from "@/lib/conversation/client/useConversationPageController";
import { motion, useScroll, useSpring } from "framer-motion";
import { Suspense, useEffect, useState } from "react";

function LandingConversationAssembly() {
  const ctrl = useConversationPageController("/");
  const createModelProps = (model: (typeof ctrl.models)[number], index: number) => ({
    index,
    modelCount: ctrl.models.length,
    model,
    pageFeatures: ctrl.pageFeatures,
    setupUi: ctrl.setupUi,
    isAdminUser: ctrl.isAdminUser,
    latestAdminKbId: ctrl.latestAdminKbId,
    tools: ctrl.tools,
    toolOptions: ctrl.toolOptions,
    toolById: ctrl.toolById,
    providerByKey: ctrl.providerByKey,
    agentVersionsByGroup: ctrl.agentVersionsByGroup,
    formatKstDateTime: ctrl.formatKstDateTime,
    agentGroupOptions: ctrl.agentGroupOptions,
    llmOptions: ctrl.llmOptions,
    kbOptions: ctrl.kbOptions,
    adminKbOptions: ctrl.adminKbOptions,
    providerOptions: ctrl.providerOptions,
    routeOptions: ctrl.routeOptions,
    kbItems: ctrl.kbItems,
    inlineKbSamples: ctrl.inlineKbSamples,
    quickReplyDrafts: ctrl.quickReplyDrafts,
    lockedReplySelections: ctrl.lockedReplySelections,
    setQuickReplyDrafts: ctrl.setQuickReplyDrafts,
    setLockedReplySelections: ctrl.setLockedReplySelections,
    onRemoveModel: ctrl.handleRemoveModel,
    onCopySessionId: ctrl.handleCopySessionId,
    onOpenSessionInNewTab: ctrl.openSessionInNewTab,
    onDeleteSession: ctrl.handleDeleteSession,
    onUpdateModel: ctrl.updateModel,
    onResetModel: ctrl.resetModel,
    onSelectAgentGroup: ctrl.handleSelectAgentGroup,
    onSelectAgentVersion: ctrl.handleSelectAgentVersion,
    onSelectSession: ctrl.handleSelectSession,
    onSearchSessionById: ctrl.handleSearchSessionById,
    onChangeConversationMode: ctrl.handleChangeConversationMode,
    onCopyConversation: ctrl.handleCopyTranscript,
    onCopyIssue: ctrl.handleCopyIssueTranscript,
    onToggleMessageSelection: ctrl.toggleMessageSelection,
    onSubmitMessage: ctrl.submitMessage,
    onExpand: ctrl.expandModelLayout,
    onCollapse: ctrl.collapseModelLayout,
    onInputChange: (id: string, value: string) =>
      ctrl.updateModel(id, (m) => ({
        ...m,
        input: value,
      })),
    setLeftPaneRef: ctrl.setLeftPaneRef,
    setChatScrollRef: ctrl.setChatScrollRef,
    describeLlm: ctrl.describeLlm,
    describeRoute: ctrl.describeRoute,
  });

  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-white text-black border-b border-zinc-200 flex items-center !py-0">
      <div className="hero-bg absolute inset-0 pointer-events-none">
        <MatrixRainBackground />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] bg-gradient-to-t from-white to-transparent" />
      <div className="relative container mx-auto w-full max-w-6xl px-6">
        <div className="px-5 md:px-8 py-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mt-6 space-y-6" data-lego="ConversationModelColumns">
              {ctrl.loading ? (
                <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>로딩 중: {ctrl.loadingHints.join(", ")}</span>
                </div>
              ) : null}
              {ctrl.error ? <div className="text-sm text-rose-600">{ctrl.error}</div> : null}
              {!ctrl.loading && !ctrl.error
                ? ctrl.models.map((model, index) => {
                  const assembled = createConversationModelLegos(createModelProps(model, index));

                  return (
                    <div key={`model-${model.id}`} className="container mx-auto w-full max-w-6xl px-6">
                      <div className="grid grid-cols-1 gap-[30px] lg:grid-cols-2">
                        <div className="min-h-[380px] max-h-[500px] h-full overflow-hidden rounded-xl border border-zinc-300 bg-white">
                          <ConversationModelSetupColumnLego {...assembled.setupLegoProps} />
                        </div>
                        <div className="min-h-[380px] max-h-[500px] h-full overflow-hidden rounded-xl border border-zinc-300 bg-white">
                          <ConversationModelChatColumnLego {...assembled.chatLegoProps} />
                        </div>
                      </div>
                    </div>
                  );
                })
                : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const [settings, setSettings] = useState<LandingSettings>(() => loadLandingSettings());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "mejai_landing_settings_v1") {
        setSettings(loadLandingSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div
      className="relative bg-white text-black selection:bg-black selection:text-white"
      style={{ fontFamily: settings.landingFontFamily || undefined }}
    >
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-black z-[100] origin-left" style={{ scaleX }} />

      <Suspense fallback={null}>
        <LandingConversationAssembly />
      </Suspense>

      <div
        className="space-y-0"
        style={{
          paddingTop: settings.sectionsPaddingTop,
          paddingBottom: settings.sectionsPaddingBottom,
          marginTop: settings.sectionsMarginTop,
          marginBottom: settings.sectionsMarginBottom,
        }}
      >
        <Features settings={settings} />
        <Process settings={settings} />
        <Comparison settings={settings} />
        <ConsolePreview settings={settings} />
        <Trust settings={settings} />
        <CTA settings={settings} />
      </div>

      <Footer settings={settings} />
    </div>
  );
}
