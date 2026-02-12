import { NextRequest, NextResponse } from "next/server";

function shortHeader(value: string | null, max = 180) {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const method = req.method;
  const ua = shortHeader(req.headers.get("user-agent"));
  const referer = shortHeader(req.headers.get("referer"));
  const accept = shortHeader(req.headers.get("accept"));
  const secFetchSite = req.headers.get("sec-fetch-site") || "-";
  const secFetchMode = req.headers.get("sec-fetch-mode") || "-";
  const secFetchDest = req.headers.get("sec-fetch-dest") || "-";
  const nextRouterPrefetch = req.headers.get("next-router-prefetch") || "-";
  const purpose = req.headers.get("purpose") || req.headers.get("sec-purpose") || "-";
  const rsc = req.headers.get("rsc") || "-";
  const xff = shortHeader(req.headers.get("x-forwarded-for"));

  console.log(
    `[REQ_TRACE] ${method} ${pathname}${search} ua="${ua}" referer="${referer}" accept="${accept}" sec_fetch_site=${secFetchSite} sec_fetch_mode=${secFetchMode} sec_fetch_dest=${secFetchDest} next_router_prefetch=${nextRouterPrefetch} purpose=${purpose} rsc=${rsc} xff="${xff}"`
  );

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/settings",
    "/app/settings/:path*",
    "/app/admin",
    "/app/admin/:path*",
    "/app/laboratory",
    "/app/laboratory/:path*",
  ],
};
