import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getUserIdFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const supabaseServer = getSupabaseServerClient();
  const userId = getUserIdFromRequest();
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "Untitled");
  const keyRoot = String(formData.get("keyRoot") ?? "C");
  const youtubeUrlRaw = String(formData.get("youtubeUrl") ?? "").trim();
  const youtubeUrl = youtubeUrlRaw.length > 0 ? youtubeUrlRaw : null;
  const file = formData.get("audio") as File | null;

  if (!file) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }

  const songId = randomUUID();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "wav";
  const storagePath = `${userId}/${songId}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await supabaseServer.storage
    .from("audio")
    .upload(storagePath, bytes, { contentType: file.type || "audio/wav", upsert: false });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const songInsert = await supabaseServer.from("songs").insert({
    id: songId,
    user_id: userId,
    title,
    source_type: "upload",
    youtube_url: youtubeUrl,
    audio_path: storagePath,
    key_root: keyRoot
  });

  if (songInsert.error) {
    return NextResponse.json({ error: songInsert.error.message }, { status: 500 });
  }

  const transcriptionInsert = await supabaseServer
    .from("transcriptions")
    .insert({ song_id: songId, status: "queued" })
    .select("id")
    .single();

  if (transcriptionInsert.error) {
    return NextResponse.json({ error: transcriptionInsert.error.message }, { status: 500 });
  }

  return NextResponse.json({ songId, transcriptionId: transcriptionInsert.data.id });
}
