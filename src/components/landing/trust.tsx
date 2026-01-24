import { Shield, Lock, EyeOff, Search } from "lucide-react";
import type { LandingSettings } from "@/lib/landingSettings";

const trustIcons = [Shield, Lock, EyeOff, Search];

export function Trust({ settings }: { settings: LandingSettings }) {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-bold mb-4" style={{ fontSize: settings.trustTitleSize }}>
            {settings.trustTitle}
          </h2>
          <p className="text-muted-foreground" style={{ fontSize: settings.trustSubtitleSize }}>
            {settings.trustSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {settings.trustItems.map((item, index) => {
            const Icon = trustIcons[index] || Shield;
            return (
              <div key={index} className="flex flex-col items-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
