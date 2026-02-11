import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { convertToKunkunshi } from "../../lib/music";
import { extractMelodyFromAudio } from "../../lib/transcription";

const port = Number(process.env.PORT ?? 8080);
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTranscription(transcriptionId: string) {
  await supabase.from("transcriptions").update({ status: "processing", error: null }).eq("id", transcriptionId);

  const trx = await supabase
    .from("transcriptions")
    .select("id,song_id")
    .eq("id", transcriptionId)
    .single();

  if (trx.error) throw new Error(trx.error.message);

  const song = await supabase
    .from("songs")
    .select("id,key_root,audio_path")
    .eq("id", trx.data.song_id)
    .single();

  if (song.error) throw new Error(song.error.message);
  if (!song.data.audio_path) throw new Error("song.audio_path is missing");

  const download = await supabase.storage.from("audio").download(song.data.audio_path);
  if (download.error) throw new Error(download.error.message);

  const bytes = new Uint8Array(await download.data.arrayBuffer());
  const notes = await extractMelodyFromAudio(bytes);
  const conversion = convertToKunkunshi(notes, song.data.key_root);

  await supabase.from("transcriptions").update({ status: "done", notes_json: notes, error: null }).eq("id", transcriptionId);
  await supabase.from("conversions").insert({
    transcription_id: transcriptionId,
    strategy: "auto",
    kunkunshi_json: conversion
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && req.url === "/tasks/transcribe") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const transcriptionId = String(payload.transcriptionId ?? "");
        if (!transcriptionId) {
          res.writeHead(400);
          res.end("transcriptionId is required");
          return;
        }

        await runTranscription(transcriptionId);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown worker error";
        const payload = JSON.parse(body || "{}");
        if (payload.transcriptionId) {
          await supabase
            .from("transcriptions")
            .update({ status: "failed", error: message })
            .eq("id", payload.transcriptionId);
        }
        res.writeHead(500);
        res.end(message);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`worker listening on :${port}`);
});
