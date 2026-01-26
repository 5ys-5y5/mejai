"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  defaultLandingSettings,
  loadLandingSettings,
  saveLandingSettings,
  type LandingSettings,
} from "@/lib/landingSettings";
import { formatKstTime } from "@/lib/kst";

type SectionKey =
  | "global"
  | "hero"
  | "features"
  | "process"
  | "comparison"
  | "console"
  | "trust"
  | "cta"
  | "footer";

const sectionOptions: Array<{ id: SectionKey; label: string }> = [
  { id: "global", label: "공통 / 섹션 래퍼" },
  { id: "hero", label: "히어로" },
  { id: "features", label: "핵심 기능" },
  { id: "process", label: "프로세스" },
  { id: "comparison", label: "비교" },
  { id: "console", label: "콘솔 미리보기" },
  { id: "trust", label: "신뢰/보안" },
  { id: "cta", label: "콜투액션" },
  { id: "footer", label: "푸터" },
];

const numberFields: Array<keyof LandingSettings> = [
  "heroTitleSize",
  "heroSubtitleSize",
  "heroContentPaddingTop",
  "heroContentPaddingBottom",
  "heroContentMarginTop",
  "heroContentMarginBottom",
  "heroContentMaxWidth",
  "sectionsPaddingTop",
  "sectionsPaddingBottom",
  "sectionsMarginTop",
  "sectionsMarginBottom",
  "featuresTitleSize",
  "featuresSubtitleSize",
  "processTitleSize",
  "processSubtitleSize",
  "comparisonTitleSize",
  "comparisonSubtitleSize",
  "consoleTitleSize",
  "consoleSubtitleSize",
  "trustTitleSize",
  "trustSubtitleSize",
  "ctaTitleSize",
  "ctaSubtitleSize",
  "footerPaddingTop",
  "footerPaddingBottom",
  "footerMarginTop",
  "footerMarginBottom",
];

export function AdminClient() {
  const router = useRouter();
  const [settings, setSettings] = useState<LandingSettings>(defaultLandingSettings);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionKey>("hero");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(loadLandingSettings());
  }, []);

  useEffect(() => {
    let mounted = true;
    const redirectBack = () => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      if (typeof document !== "undefined" && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          if (referrerUrl.origin === window.location.origin) {
            router.replace(document.referrer);
            return;
          }
        } catch {
          // ignore invalid referrer
        }
      }
      router.replace("/");
    };

    const run = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        redirectBack();
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        redirectBack();
        return;
      }
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          redirectBack();
          return;
        }
        const { data: access, error: accessError } = await supabase
          .from("user_access")
          .select("is_admin")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (accessError || !access?.is_admin) {
          redirectBack();
          return;
        }
        if (!mounted) return;
        setReady(true);
      } catch {
        redirectBack();
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  const previewStyle = useMemo(
    () => ({
      fontFamily: settings.landingFontFamily || undefined,
    }),
    [settings.landingFontFamily]
  );

  const updateField = (key: keyof LandingSettings, value: string) => {
    if (numberFields.includes(key)) {
      const parsed = Number(value);
      setSettings((prev) => ({
        ...prev,
        [key]: Number.isFinite(parsed) ? parsed : 0,
      }));
      return;
    }
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateArrayItem = <K extends keyof LandingSettings>(
    key: K,
    index: number,
    field: string,
    value: string
  ) => {
    setSettings((prev) => {
      const list = [...(prev[key] as Array<Record<string, string>>)];
      const nextItem = { ...list[index], [field]: value };
      list[index] = nextItem;
      return { ...prev, [key]: list } as LandingSettings;
    });
  };

  const handleSave = () => {
    saveLandingSettings(settings);
    setSavedAt(formatKstTime(new Date().toISOString()));
  };

  const handleReset = () => {
    setSettings(defaultLandingSettings);
    saveLandingSettings(defaultLandingSettings);
    setSavedAt(formatKstTime(new Date().toISOString()));
  };

  const renderFields = () => {
    switch (selectedSection) {
      case "global":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              폰트 패밀리
              <input
                className="h-10 rounded-lg border border-zinc-300 px-3"
                value={settings.landingFontFamily}
                onChange={(event) => updateField("landingFontFamily", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                섹션 래퍼 패딩 Top(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.sectionsPaddingTop}
                  onChange={(event) => updateField("sectionsPaddingTop", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                섹션 래퍼 패딩 Bottom(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.sectionsPaddingBottom}
                  onChange={(event) => updateField("sectionsPaddingBottom", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                섹션 래퍼 마진 Top(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.sectionsMarginTop}
                  onChange={(event) => updateField("sectionsMarginTop", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                섹션 래퍼 마진 Bottom(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.sectionsMarginBottom}
                  onChange={(event) => updateField("sectionsMarginBottom", event.target.value)}
                />
              </label>
            </div>
          </>
        );
      case "hero":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              배지 문구
              <input
                className="h-10 rounded-lg border border-zinc-300 px-3"
                value={settings.heroBadge}
                onChange={(event) => updateField("heroBadge", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              메인 타이틀
              <input
                className="h-10 rounded-lg border border-zinc-300 px-3"
                value={settings.heroTitle}
                onChange={(event) => updateField("heroTitle", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              서브 타이틀
              <textarea
                className="min-h-[96px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.heroSubtitle}
                onChange={(event) => updateField("heroSubtitle", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Primary CTA
                <input
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.primaryCta}
                  onChange={(event) => updateField("primaryCta", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Secondary CTA
                <input
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.secondaryCta}
                  onChange={(event) => updateField("secondaryCta", event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.heroTitleSize}
                  onChange={(event) => updateField("heroTitleSize", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                서브 타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.heroSubtitleSize}
                  onChange={(event) => updateField("heroSubtitleSize", event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                콘텐츠 패딩 Top(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.heroContentPaddingTop}
                  onChange={(event) => updateField("heroContentPaddingTop", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                콘텐츠 패딩 Bottom(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.heroContentPaddingBottom}
                  onChange={(event) => updateField("heroContentPaddingBottom", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                콘텐츠 마진 Top(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.heroContentMarginTop}
                  onChange={(event) => updateField("heroContentMarginTop", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                콘텐츠 마진 Bottom(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.heroContentMarginBottom}
                  onChange={(event) => updateField("heroContentMarginBottom", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                콘텐츠 최대 폭(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.heroContentMaxWidth}
                  onChange={(event) => updateField("heroContentMaxWidth", event.target.value)}
                />
              </label>
            </div>
          </>
        );
      case "features":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              섹션 아이브로우
              <input
                className="h-10 rounded-lg border border-zinc-300 px-3"
                value={settings.featuresEyebrow}
                onChange={(event) => updateField("featuresEyebrow", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.featuresTitle}
                onChange={(event) => updateField("featuresTitle", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              서브 타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.featuresSubtitle}
                onChange={(event) => updateField("featuresSubtitle", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.featuresTitleSize}
                  onChange={(event) => updateField("featuresTitleSize", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                서브 타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.featuresSubtitleSize}
                  onChange={(event) => updateField("featuresSubtitleSize", event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-4">
              {settings.featuresCards.map((card, index) => (
                <div key={index} className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-xs font-semibold text-zinc-500">카드 {index + 1}</div>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    제목
                    <input
                      className="h-10 rounded-lg border border-zinc-300 px-3"
                      value={card.title}
                      onChange={(event) =>
                        updateArrayItem("featuresCards", index, "title", event.target.value)
                      }
                    />
                  </label>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    설명
                    <textarea
                      className="min-h-[64px] rounded-lg border border-zinc-300 px-3 py-2"
                      value={card.description}
                      onChange={(event) =>
                        updateArrayItem("featuresCards", index, "description", event.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </>
        );
      case "process":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.processTitle}
                onChange={(event) => updateField("processTitle", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              서브 타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.processSubtitle}
                onChange={(event) => updateField("processSubtitle", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.processTitleSize}
                  onChange={(event) => updateField("processTitleSize", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                서브 타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.processSubtitleSize}
                  onChange={(event) => updateField("processSubtitleSize", event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-4">
              {settings.processSteps.map((step, index) => (
                <div key={step.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-xs font-semibold text-zinc-500">스텝 {step.id}</div>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    제목
                    <input
                      className="h-10 rounded-lg border border-zinc-300 px-3"
                      value={step.title}
                      onChange={(event) =>
                        updateArrayItem("processSteps", index, "title", event.target.value)
                      }
                    />
                  </label>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    설명
                    <textarea
                      className="min-h-[64px] rounded-lg border border-zinc-300 px-3 py-2"
                      value={step.description}
                      onChange={(event) =>
                        updateArrayItem("processSteps", index, "description", event.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </>
        );
      case "comparison":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.comparisonTitle}
                onChange={(event) => updateField("comparisonTitle", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              서브 타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.comparisonSubtitle}
                onChange={(event) => updateField("comparisonSubtitle", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.comparisonTitleSize}
                  onChange={(event) => updateField("comparisonTitleSize", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                서브 타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.comparisonSubtitleSize}
                  onChange={(event) => updateField("comparisonSubtitleSize", event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-4">
              {settings.comparisonRows.map((row, index) => (
                <div key={index} className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-xs font-semibold text-zinc-500">행 {index + 1}</div>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    항목
                    <input
                      className="h-10 rounded-lg border border-zinc-300 px-3"
                      value={row.feature}
                      onChange={(event) =>
                        updateArrayItem("comparisonRows", index, "feature", event.target.value)
                      }
                    />
                  </label>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    기존 상담
                    <input
                      className="h-10 rounded-lg border border-zinc-300 px-3"
                      value={row.traditional}
                      onChange={(event) =>
                        updateArrayItem("comparisonRows", index, "traditional", event.target.value)
                      }
                    />
                  </label>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    Mejai
                    <input
                      className="h-10 rounded-lg border border-zinc-300 px-3"
                      value={row.ai}
                      onChange={(event) =>
                        updateArrayItem("comparisonRows", index, "ai", event.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </>
        );
      case "console":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.consoleTitle}
                onChange={(event) => updateField("consoleTitle", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              서브 타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.consoleSubtitle}
                onChange={(event) => updateField("consoleSubtitle", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.consoleTitleSize}
                  onChange={(event) => updateField("consoleTitleSize", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                서브 타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.consoleSubtitleSize}
                  onChange={(event) => updateField("consoleSubtitleSize", event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-4">
              {settings.consoleCards.map((card, index) => (
                <div key={index} className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-xs font-semibold text-zinc-500">카드 {index + 1}</div>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    제목
                    <input
                      className="h-10 rounded-lg border border-zinc-300 px-3"
                      value={card.title}
                      onChange={(event) =>
                        updateArrayItem("consoleCards", index, "title", event.target.value)
                      }
                    />
                  </label>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    설명
                    <textarea
                      className="min-h-[64px] rounded-lg border border-zinc-300 px-3 py-2"
                      value={card.description}
                      onChange={(event) =>
                        updateArrayItem("consoleCards", index, "description", event.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </>
        );
      case "trust":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              타이틀
              <input
                className="h-10 rounded-lg border border-zinc-300 px-3"
                value={settings.trustTitle}
                onChange={(event) => updateField("trustTitle", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              서브 타이틀
              <input
                className="h-10 rounded-lg border border-zinc-300 px-3"
                value={settings.trustSubtitle}
                onChange={(event) => updateField("trustSubtitle", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.trustTitleSize}
                  onChange={(event) => updateField("trustTitleSize", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                서브 타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.trustSubtitleSize}
                  onChange={(event) => updateField("trustSubtitleSize", event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-4">
              {settings.trustItems.map((item, index) => (
                <div key={index} className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-xs font-semibold text-zinc-500">아이템 {index + 1}</div>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    제목
                    <input
                      className="h-10 rounded-lg border border-zinc-300 px-3"
                      value={item.title}
                      onChange={(event) =>
                        updateArrayItem("trustItems", index, "title", event.target.value)
                      }
                    />
                  </label>
                  <label className="mt-2 grid gap-2 text-sm font-medium">
                    설명
                    <textarea
                      className="min-h-[64px] rounded-lg border border-zinc-300 px-3 py-2"
                      value={item.description}
                      onChange={(event) =>
                        updateArrayItem("trustItems", index, "description", event.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </>
        );
      case "cta":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.ctaTitle}
                onChange={(event) => updateField("ctaTitle", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              서브 타이틀
              <textarea
                className="min-h-[72px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.ctaSubtitle}
                onChange={(event) => updateField("ctaSubtitle", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Primary CTA
                <input
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.ctaPrimary}
                  onChange={(event) => updateField("ctaPrimary", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Secondary CTA
                <input
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.ctaSecondary}
                  onChange={(event) => updateField("ctaSecondary", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.ctaTitleSize}
                  onChange={(event) => updateField("ctaTitleSize", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                서브 타이틀 크기(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.ctaSubtitleSize}
                  onChange={(event) => updateField("ctaSubtitleSize", event.target.value)}
                />
              </label>
            </div>
          </>
        );
      case "footer":
        return (
          <>
            <label className="grid gap-2 text-sm font-medium">
              브랜드명
              <input
                className="h-10 rounded-lg border border-zinc-300 px-3"
                value={settings.footerBrand}
                onChange={(event) => updateField("footerBrand", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              설명
              <textarea
                className="min-h-[96px] rounded-lg border border-zinc-300 px-3 py-2"
                value={settings.footerDescription}
                onChange={(event) => updateField("footerDescription", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              저작권 문구
              <input
                className="h-10 rounded-lg border border-zinc-300 px-3"
                value={settings.footerCopyright}
                onChange={(event) => updateField("footerCopyright", event.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                패딩 Top(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.footerPaddingTop}
                  onChange={(event) => updateField("footerPaddingTop", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                패딩 Bottom(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.footerPaddingBottom}
                  onChange={(event) => updateField("footerPaddingBottom", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                마진 Top(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.footerMarginTop}
                  onChange={(event) => updateField("footerMarginTop", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                마진 Bottom(px)
                <input
                  type="number"
                  className="h-10 rounded-lg border border-zinc-300 px-3"
                  value={settings.footerMarginBottom}
                  onChange={(event) => updateField("footerMarginBottom", event.target.value)}
                />
              </label>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderPreview = () => {
    switch (selectedSection) {
      case "global":
        return (
          <div className="space-y-3">
            <div className="text-sm text-zinc-500">섹션 래퍼 미리보기</div>
            <div
              className="rounded-xl border border-dashed border-zinc-300 bg-white"
              style={{
                paddingTop: settings.sectionsPaddingTop,
                paddingBottom: settings.sectionsPaddingBottom,
                marginTop: settings.sectionsMarginTop,
                marginBottom: settings.sectionsMarginBottom,
              }}
            >
              <div className="rounded-xl bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
                섹션 콘텐츠 영역
              </div>
            </div>
          </div>
        );
      case "hero":
        return (
          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              {settings.heroBadge}
            </div>
            <div className="text-black" style={{ fontSize: settings.heroTitleSize }}>
              {settings.heroTitle}
            </div>
            <div
              className="text-zinc-900 whitespace-pre-line"
              style={{ fontSize: settings.heroSubtitleSize }}
            >
              {settings.heroSubtitle}
            </div>
            <div className="flex gap-3">
              <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
                {settings.primaryCta}
              </div>
              <div className="rounded-full bg-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-800">
                {settings.secondaryCta}
              </div>
            </div>
          </div>
        );
      case "features":
        return (
          <div className="space-y-4">
            <div className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400">
              {settings.featuresEyebrow}
            </div>
            <div
              className="font-bold whitespace-pre-line"
              style={{ fontSize: settings.featuresTitleSize }}
            >
              {settings.featuresTitle}
            </div>
            <div
              className="text-zinc-500 whitespace-pre-line"
              style={{ fontSize: settings.featuresSubtitleSize }}
            >
              {settings.featuresSubtitle}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {settings.featuresCards.map((card, index) => (
                <div key={index} className="rounded-lg border border-zinc-200 p-3">
                  <div className="text-sm font-semibold">{card.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">{card.description}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "process":
        return (
          <div className="space-y-4">
            <div
              className="font-bold whitespace-pre-line"
              style={{ fontSize: settings.processTitleSize }}
            >
              {settings.processTitle}
            </div>
            <div
              className="text-zinc-500 whitespace-pre-line"
              style={{ fontSize: settings.processSubtitleSize }}
            >
              {settings.processSubtitle}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {settings.processSteps.map((step) => (
                <div key={step.id} className="rounded-lg border border-zinc-200 p-3">
                  <div className="text-xs text-zinc-400">{step.id}</div>
                  <div className="text-sm font-semibold">{step.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">{step.description}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "comparison":
        return (
          <div className="space-y-4">
            <div
              className="font-bold whitespace-pre-line"
              style={{ fontSize: settings.comparisonTitleSize }}
            >
              {settings.comparisonTitle}
            </div>
            <div
              className="text-zinc-500 whitespace-pre-line"
              style={{ fontSize: settings.comparisonSubtitleSize }}
            >
              {settings.comparisonSubtitle}
            </div>
            <div className="space-y-2 text-sm">
              {settings.comparisonRows.map((row, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-200 p-3">
                  <div className="font-semibold">{row.feature}</div>
                  <div className="text-zinc-500">{row.traditional}</div>
                  <div className="font-semibold">{row.ai}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "console":
        return (
          <div className="space-y-4">
            <div
              className="font-bold whitespace-pre-line"
              style={{ fontSize: settings.consoleTitleSize }}
            >
              {settings.consoleTitle}
            </div>
            <div
              className="text-zinc-500 whitespace-pre-line"
              style={{ fontSize: settings.consoleSubtitleSize }}
            >
              {settings.consoleSubtitle}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {settings.consoleCards.map((card, index) => (
                <div key={index} className="rounded-lg border border-zinc-200 p-3">
                  <div className="text-sm font-semibold">{card.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">{card.description}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "trust":
        return (
          <div className="space-y-4">
            <div className="font-bold" style={{ fontSize: settings.trustTitleSize }}>
              {settings.trustTitle}
            </div>
            <div className="text-zinc-500" style={{ fontSize: settings.trustSubtitleSize }}>
              {settings.trustSubtitle}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {settings.trustItems.map((item, index) => (
                <div key={index} className="rounded-lg border border-zinc-200 p-3">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "cta":
        return (
          <div className="space-y-4 text-center">
            <div className="font-bold whitespace-pre-line" style={{ fontSize: settings.ctaTitleSize }}>
              {settings.ctaTitle}
            </div>
            <div
              className="text-zinc-500 whitespace-pre-line"
              style={{ fontSize: settings.ctaSubtitleSize }}
            >
              {settings.ctaSubtitle}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
                {settings.ctaPrimary}
              </div>
              <div className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold">
                {settings.ctaSecondary}
              </div>
            </div>
          </div>
        );
      case "footer":
        return (
          <div className="space-y-3">
            <div className="text-lg font-semibold">{settings.footerBrand}</div>
            <div className="text-sm text-zinc-500 whitespace-pre-line">{settings.footerDescription}</div>
            <div className="text-xs text-zinc-400">{settings.footerCopyright}</div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">랜딩 페이지 설정</h1>
        <p className="mt-2 text-sm text-zinc-500">
          http://localhost:3000/ 랜딩페이지의 문구/폰트/크기/패딩/마진을 조정합니다.
        </p>

        <div className="mt-8">
          <label className="text-sm font-medium text-zinc-600">편집할 섹션</label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
            value={selectedSection}
            onChange={(event) => setSelectedSection(event.target.value as SectionKey)}
          >
            {sectionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8 grid gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold">설정</h2>
            <div className="mt-4 grid gap-4">{renderFields()}</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
          >
            저장
          </button>
          <button
            onClick={handleReset}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold"
          >
            기본값으로 복원
          </button>
          {savedAt ? <span className="text-sm text-zinc-500">마지막 저장: {savedAt}</span> : null}
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold">미리보기</h2>
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6" style={previewStyle}>
            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
}
