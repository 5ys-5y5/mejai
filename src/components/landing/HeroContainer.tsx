"use client";

import type { LandingSettings } from "@/lib/landingSettings";
import { HeroModelCard } from "@/components/conversation/HeroModelCard";
import { MatrixRainBackground } from "@/components/landing/matrix-rain-background";
import { useHeroPageController } from "@/lib/conversation/client/useHeroPageController";

export function HeroContainer({ settings }: { settings: LandingSettings }) {
  void settings;
  const ctrl = useHeroPageController();

  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-white text-black border-b border-zinc-200 flex items-center !py-0">
      <div className="hero-bg absolute inset-0 pointer-events-none">
        <MatrixRainBackground />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] bg-gradient-to-t from-white to-transparent" />
      <div className="relative container mx-auto w-full max-w-6xl px-6">
        <HeroModelCard
          pageFeatures={ctrl.pageFeatures}
          setupUi={ctrl.setupUi}
          isAdminUser={ctrl.isAdminUser}
          selectedLlm={ctrl.selectedLlm}
          llmOptions={ctrl.llmOptions}
          onSelectLlm={ctrl.setSelectedLlm}
          userKb={ctrl.userKb}
          onChangeUserKb={ctrl.setUserKb}
          inlineKbSamples={ctrl.inlineKbSamples}
          inlineKbSampleSelectionOrder={ctrl.inlineKbSampleSelectionOrder}
          inlineKbSampleConflict={ctrl.inlineKbSampleConflict}
          onApplyInlineKbSamples={ctrl.applyInlineKbSamples}
          providerOptions={ctrl.providerOptions}
          selectedProviderKeys={ctrl.selectedProviderKeys}
          onChangeProviderKeys={ctrl.setSelectedProviderKeys}
          actionOptions={ctrl.filteredActionOptions}
          selectedMcpToolIds={ctrl.selectedMcpToolIds}
          onChangeMcpToolIds={ctrl.setSelectedMcpToolIds}
          adminLogControlsOpen={ctrl.adminLogControlsOpen}
          onToggleAdminOpen={() => ctrl.setAdminLogControlsOpen((prev) => !prev)}
          chatSelectionEnabled={ctrl.chatSelectionEnabled}
          onToggleSelectionEnabled={() => {
            ctrl.setChatSelectionEnabled((prev) => !prev);
            if (ctrl.chatSelectionEnabled) ctrl.setSelectedMessageIds([]);
          }}
          showAdminLogs={ctrl.showAdminLogs}
          onToggleShowAdminLogs={() => ctrl.setShowAdminLogs((prev) => !prev)}
          onCopyTranscript={ctrl.handleCopyTranscript}
          onCopyIssueTranscript={ctrl.handleCopyIssueTranscript}
          messages={ctrl.messages}
          selectedMessageIds={ctrl.selectedMessageIds}
          onToggleMessageSelection={ctrl.toggleMessageSelection}
          sessionId={ctrl.sessionId}
          sending={ctrl.sending}
          quickReplyDrafts={ctrl.quickReplyDrafts}
          lockedReplySelections={ctrl.lockedReplySelections}
          setQuickReplyDrafts={ctrl.setQuickReplyDrafts}
          setLockedReplySelections={ctrl.setLockedReplySelections}
          onSendQuickReply={(text) => void ctrl.send(text)}
          chatScrollRef={ctrl.scrollRef}
          input={ctrl.input}
          onInputChange={ctrl.setInput}
          onSubmitInput={() => {
            void ctrl.handleSubmit();
          }}
          placeholder={ctrl.placeholder}
        />
      </div>
    </section>
  );
}
