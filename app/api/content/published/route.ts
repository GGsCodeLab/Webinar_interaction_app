import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { content } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import { nanoid } from "nanoid";

export async function GET() {
  const rows = await db
    .select({ id: content.id, title: content.title, slug: content.slug, updatedAt: content.updatedAt })
    .from(content)
    .where(eq(content.published, true))
    .orderBy(content.updatedAt);

  const list = await Promise.all(
    rows.map(async (row) => {
      let slug = row.slug?.trim();
      if (!slug) {
        slug = slugify(row.title);
        const existing = await db.query.content.findFirst({ where: eq(content.slug, slug) });
        if (existing && existing.id !== row.id) slug = `${slug}-${nanoid(6)}`;
        await db.update(content).set({ slug }).where(eq(content.id, row.id));
      }
      return { id: row.id, title: row.title, slug, updatedAt: row.updatedAt };
    })
  );
  return NextResponse.json(list);
}
