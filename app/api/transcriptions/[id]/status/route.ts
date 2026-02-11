import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabaseServer = getSupabaseServerClient();
  const userId = getUserIdFromRequest();

  const songQuery = await supabaseServer
    .from("songs")
    .select("id,title,key_root,youtube_url,audio_path")
    .eq("id", params.id)
    .eq("user_id", userId)
    .single();

  if (songQuery.error) {
    return NextResponse.json({ error: songQuery.error.message }, { status: 404 });
  }

  const transcriptionQuery = await supabaseServer
    .from("transcriptions")
    .select("id,status,error,notes_json")
    .eq("song_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (transcriptionQuery.error) {
    return NextResponse.json({ error: transcriptionQuery.error.message }, { status: 404 });
  }

  const conversionQuery = await supabaseServer
    .from("conversions")
    .select("id,kunkunshi_json")
    .eq("transcription_id", transcriptionQuery.data.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const audioUrl = songQuery.data.audio_path
    ? supabaseServer.storage.from("audio").getPublicUrl(songQuery.data.audio_path).data.publicUrl
    : null;

  return NextResponse.json({
    song: {
      ...songQuery.data,
      audio_url: audioUrl
    },
    transcription: transcriptionQuery.data,
    conversion: conversionQuery.data
  });
}
