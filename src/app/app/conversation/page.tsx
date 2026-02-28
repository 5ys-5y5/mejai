"use client";

import { WidgetManagementPanel } from "@/components/conversation/WidgetManagementPanel";

export default function ConversationPage() {
  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mt-6 space-y-6">
          <WidgetManagementPanel />
        </div>
      </div>
    </div>
  );
}
