import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerContext } from "@/lib/serverAuth";

async function buildCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function requireAppAdminAccess(fromPath: string) {
  const context = await getServerContext("", await buildCookieHeader());

  if ("error" in context) {
    redirect(`/login?from=${encodeURIComponent(fromPath)}`);
  }

  const { data: access, error } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error || !access?.is_admin) {
    redirect("/app");
  }
}
