import { NextResponse } from "next/server";
import { fetchOEmbed } from "@/lib/oembed";
import { requireRole, HttpError } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const url = new URL(req.url).searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    const data = await fetchOEmbed(url);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
