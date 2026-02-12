import { redirect } from "next/navigation";

export default function AdminDesignSystemRedirect() {
  redirect("/app/admin?tab=design-system");
}
