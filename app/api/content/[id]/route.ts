import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { content } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { nanoid } from "nanoid";
import { and, ne } from "drizzle-orm";
import type { Server as SocketIOServer } from "socket.io";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idOrSlug } = await params;
  const bySlug = !/^\d+$/.test(idOrSlug);
  const doc = bySlug
    ? (await db.query.content.findFirst({ where: eq(content.slug, idOrSlug) }))
      ?? await db.query.content.findFirst({
          where: sql`${content.slug} is not null and lower(trim(${content.slug})) = lower(trim(${idOrSlug}))`,
        })
    : await db.query.content.findFirst({ where: eq(content.id, parseInt(idOrSlug, 10)) });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  if (!session && !doc.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!doc.slug || !doc.slug.trim()) {
    let slug = slugify(doc.title);
    const existing = await db.query.content.findFirst({ where: eq(content.slug, slug) });
    if (existing && existing.id !== doc.id) slug = `${slug}-${nanoid(6)}`;
    await db.update(content).set({ slug }).where(eq(content.id, doc.id));
    return NextResponse.json({ ...doc, slug });
  }
  return NextResponse.json(doc);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const title = body.title?.trim();
  const markdown = typeof body.markdown === "string" ? body.markdown : undefined;
  const published = typeof body.published === "boolean" ? body.published : undefined;

  const updates: { title?: string; markdown?: string; published?: boolean; slug?: string; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (title !== undefined) {
    updates.title = title;
    let newSlug = slugify(title);
    const existing = await db.query.content.findFirst({
      where: and(eq(content.slug, newSlug), ne(content.id, parseInt(id, 10))),
    });
    if (existing) newSlug = `${newSlug}-${nanoid(6)}`;
    updates.slug = newSlug;
  }
  if (markdown !== undefined) updates.markdown = markdown;
  if (published !== undefined) updates.published = published;

  // When publishing, set slug only if doc doesn't have one yet (avoid overwriting existing slug)
  if (published === true && updates.slug === undefined) {
    const current = await db.query.content.findFirst({ where: eq(content.id, parseInt(id, 10)) });
    if (current?.title && (!current.slug || !current.slug.trim())) {
      let newSlug = slugify(current.title);
      const existing = await db.query.content.findFirst({
        where: and(eq(content.slug, newSlug), ne(content.id, parseInt(id, 10))),
      });
      if (existing) newSlug = `${newSlug}-${nanoid(6)}`;
      updates.slug = newSlug;
    }
  }

  const [updated] = await db
    .update(content)
    .set(updates)
    .where(eq(content.id, parseInt(id)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Broadcast to attendees when publish state changes so they refresh the content list
  if (published !== undefined) {
    const io = (globalThis as unknown as { io?: SocketIOServer }).io;
    if (io) {
      io.emit("content:visibility", {
        docId: updated.id,
        title: updated.title,
        published: updated.published,
      });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(content).where(eq(content.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
