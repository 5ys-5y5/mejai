import { requireAppAdminAccess } from "@/lib/requireAppAdminAccess";

export default async function RulesLayout({ children }: { children: React.ReactNode }) {
  await requireAppAdminAccess("/app/rules");
  return children;
}
