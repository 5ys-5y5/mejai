import { NextResponse } from "next/server";
import { addKnowledge } from "@/lib/rag";

export async function POST(req: Request) {
  try {
    const { orgId, title, content, category } = await req.json();

    if (!orgId || !title || !content) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const data = await addKnowledge(orgId, title, content, category || "일반");

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("KB 업로드 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
