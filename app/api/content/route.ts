import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { content } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.select().from(content).orderBy(content.updatedAt);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = body.title?.trim();
  const markdown = typeof body.markdown === "string" ? body.markdown : "";

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  let slug = slugify(title);
  let suffix = 0;
  while (await db.query.content.findFirst({ where: eq(content.slug, suffix ? `${slug}-${suffix}` : slug) })) {
    suffix++;
  }
  if (suffix > 0) slug = `${slug}-${suffix}`;

  const [doc] = await db
    .insert(content)
    .values({ title, markdown, slug, published: false })
    .returning();
  return NextResponse.json(doc, { status: 201 });
}
