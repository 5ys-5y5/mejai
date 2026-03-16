import { requireAppAdminAccess } from "@/lib/requireAppAdminAccess";

export default async function AgentsLayout({ children }: { children: React.ReactNode }) {
  await requireAppAdminAccess("/app/agents");
  return children;
}
