import { redirect } from "next/navigation";

export default function AuditPage() {
  redirect("/app/settings?tab=audit");
}
