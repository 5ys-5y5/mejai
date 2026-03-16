import { requireAppAdminAccess } from "@/lib/requireAppAdminAccess";

export default async function CallsLayout({ children }: { children: React.ReactNode }) {
  await requireAppAdminAccess("/app/calls");
  return children;
}
