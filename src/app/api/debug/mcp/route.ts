import { NextRequest, NextResponse } from "next/server";
import { callAdapter } from "@/lib/mcpAdapters";
import { getServerContext } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
    try {
        const ctx = await getServerContext();
        if (!ctx) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { tool, params } = body;

        if (!tool) {
            return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
        }

        const result = await callAdapter(tool, params || {}, ctx);
        return NextResponse.json(result);
    } catch (error) {
        console.error("MCP Debug Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
