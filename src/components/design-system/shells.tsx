"use client";

import { useState } from "react";
import {
  Book,
  Bot,
  ClipboardCheck,
  House,
  Inbox,
  Menu,
  Palette,
  Phone,
  PhoneCall,
  RefreshCw,
  Route,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function TypographyScaleShell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      <div className="text-sm font-semibold text-slate-900">{"Typography Scale (\uD0C0\uC785\uADF8\uB798\uD53C/\uD3F0\uD2B8 \uC2A4\uCF00\uC77C)"}</div>
      <div className="mt-3 overflow-auto rounded-xl border border-slate-200">
        <div className="grid grid-cols-[120px_120px_120px_minmax(220px,1fr)] bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
          <span>Token</span>
          <span>Size</span>
          <span>Weight</span>
          <span>Sample</span>
        </div>
        <div className="grid grid-cols-[120px_120px_120px_minmax(220px,1fr)] border-t border-slate-100 px-3 py-2 text-xs text-slate-700">
          <code>text-xs</code>
          <span>12px</span>
          <span>400</span>
          <span className="text-xs">{"\uBCF4\uC870 \uC815\uBCF4/\uBA54\uD0C0 \uD14D\uC2A4\uD2B8"}</span>
        </div>
        <div className="grid grid-cols-[120px_120px_120px_minmax(220px,1fr)] border-t border-slate-100 px-3 py-2 text-xs text-slate-700">
          <code>text-sm</code>
          <span>14px</span>
          <span>400</span>
          <span className="text-sm">{"\uAE30\uBCF8 \uBCF8\uBB38 \uD14D\uC2A4\uD2B8"}</span>
        </div>
        <div className="grid grid-cols-[120px_120px_120px_minmax(220px,1fr)] border-t border-slate-100 px-3 py-2 text-xs text-slate-700">
          <code>text-base</code>
          <span>16px</span>
          <span>500</span>
          <span className="text-base">Unknown</span>
        </div>
        <div className="grid grid-cols-[120px_120px_120px_minmax(220px,1fr)] border-t border-slate-100 px-3 py-2 text-xs text-slate-700">
          <code>text-lg</code>
          <span>18px</span>
          <span>500</span>
          <span className="text-lg">{"\uC18C\uC81C\uBAA9"}</span>
        </div>
        <div className="grid grid-cols-[120px_120px_120px_minmax(220px,1fr)] border-t border-slate-100 px-3 py-2 text-xs text-slate-700">
          <code>text-2xl</code>
          <span>24px</span>
          <span>700</span>
          <span className="text-2xl font-semibold">{"\uD575\uC2EC \uD0C0\uC774\uD2C0"}</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {"\uD0C0\uC785\uADF8\uB798\uD53C \uD3F0\uD2B8\uB294 "}<code>Apple SD Gothic Neo</code>
      </div>
    </div>
  );
}

export function PageActionBarShell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      <div className="mb-2 text-sm font-semibold text-slate-900">Page Action Bar Pattern</div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <Button variant="outline" className="h-9 text-xs">
          <RefreshCw className="h-4 w-4" />
          {"\uC0C8\uB85C \uACE0\uCE68"}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs">
            {"CSV \uB0B4\uBCF4\uB0B4\uAE30"}
          </Button>
          <Button className="h-9 text-xs">{"\uC2E0\uADDC \uC0DD\uC131"}</Button>
        </div>
      </div>
    </div>
  );
}

export function SidebarNavigationShell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      <div className="mb-2 text-sm font-semibold text-slate-900">Sidebar Link Pattern</div>
      <nav className="rounded-xl border border-slate-200 bg-white py-4 px-3 space-y-5">
        <div>
          <div className="px-3 text-[11px] font-medium text-slate-500">{"\uBA54\uB274"}</div>
          <div className="mt-2 space-y-1">
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <House className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uD648 \uB300\uC2DC\uBCF4\uB4DC"}</span>
            </a>
          </div>
        </div>
        <div>
          <div className="px-3 text-[11px] font-medium text-slate-500">{"\uB77C\uC774\uBE0C"}</div>
          <div className="mt-2 space-y-1">
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <PhoneCall className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uD638\uCD9C/\uBB38\uC758"}</span>
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <Inbox className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uBB38\uC758 \uD53C\uB4DC\uBC31"}</span>
            </a>
          </div>
        </div>
        <div>
          <div className="px-3 text-[11px] font-medium text-slate-500">{"\uAD6C\uC131"}</div>
          <div className="mt-2 space-y-1">
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uC0AC\uC6A9\uC790 \uAD00\uB9AC"}</span>
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <Bot className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uBD07 \uAD00\uB9AC"}</span>
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <ClipboardCheck className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uC2B9\uC778/\uAC80\uC218"}</span>
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <Book className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uC9C0\uC2DD \uBCA0\uC774\uC2A4"}</span>
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <Route className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uD0A4\uD0B7"}</span>
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-slate-200 bg-slate-100 text-slate-900" href="#">
              <Palette className="h-4 w-4 text-emerald-600" />
              <span className="truncate">{"\uB514\uC790\uC778 \uC2DC\uC2A4\uD15C"}</span>
            </a>
          </div>
        </div>
        <div>
          <div className="px-3 text-[11px] font-medium text-slate-500">{"\uC54C\uB9BC"}</div>
          <div className="mt-2 space-y-1">
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <Phone className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uBB38\uC758 \uC0C1\uD0DC"}</span>
            </a>
          </div>
        </div>
        <div>
          <div className="px-3 text-[11px] font-medium text-slate-500">{"\uC124\uC815"}</div>
          <div className="mt-2 space-y-1">
            <a className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent text-slate-700 hover:bg-slate-50" href="#">
              <Settings className="h-4 w-4 text-slate-500" />
              <span className="truncate">{"\uC124\uC815"}</span>
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}

export function TopHeaderShell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      <div className="mb-2 text-sm font-semibold text-slate-900">Top Header Pattern</div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-transparent text-slate-600 hover:bg-slate-100">
            <Menu className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium text-slate-900">{"\uD648 \uB300\uC2DC\uBCF4\uB4DC"}</div>
          <div className="flex-1" />
          <Input placeholder={"\uAC80\uC0C9..."} className="h-8 w-56 text-xs" />
          <button className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700">A</button>
        </div>
      </div>
    </div>
  );
}

export function OverlayShell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={cn(className)} {...props}>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setModalOpen(true)}>{"\uBAA8\uB2EC \uC5F4\uAE30"}</Button>
        <Button variant="outline" onClick={() => setDrawerOpen(true)}>
          {"\uB4DC\uB85C\uC5B4 \uC5F4\uAE30"}
        </Button>
        <div className="relative">
          <Button variant="ghost" onClick={() => setMenuOpen((v) => !v)}>
            {"\uBA54\uB274"}
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 top-10 z-40 w-40 rounded-md border border-slate-200 bg-white p-1.5 shadow-sm">
              <button type="button" className="mb-1 w-full rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600">
                {"\uD1A0\uAE00 ON"}
              </button>
              <button type="button" className="w-full rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600">
                로그 ON
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">{"\uBA54\uB274, \uBAA8\uB2EC, \uB4DC\uB85C\uC5B4, \uC140\uB809\uD2B8 \uB4F1 UI \uD328\uD134\uC744 \uD655\uC778\uD558\uB294 \uC0D8\uD50C"}</div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{"\uBAA8\uB2EC"}</div>
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 p-1 text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-sm text-slate-600">{"\uC124\uC815 \uB0B4\uC6A9\uC744 \uD655\uC778\uD558\uB294 \uC601\uC5ED"}</div>
          </div>
        </div>
      ) : null}

      {drawerOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 w-72 border-r border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{"\uB4DC\uB85C\uC5B4"}</div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg border border-slate-200 p-1 text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-600">Unknown</div>
          </div>
        </>
      ) : null}
    </div>
  );
}
