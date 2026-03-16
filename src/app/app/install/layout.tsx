import { requireAppAdminAccess } from "@/lib/requireAppAdminAccess";

export default async function InstallLayout({ children }: { children: React.ReactNode }) {
  await requireAppAdminAccess("/app/install");
  return children;
}
