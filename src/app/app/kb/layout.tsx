import { requireAppAdminAccess } from "@/lib/requireAppAdminAccess";

export default async function KbLayout({ children }: { children: React.ReactNode }) {
  await requireAppAdminAccess("/app/kb");
  return children;
}
