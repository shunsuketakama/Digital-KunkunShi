"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConversionPoint, NotePoint, TranscriptionStatus } from "@/lib/types";

type StatusPayload = {
  song: {
    id: string;
    title: string;
    key_root: string;
    youtube_url: string | null;
    audio_url: string | null;
  };
  transcription: {
    id: string;
    status: TranscriptionStatus;
    error: string | null;
    notes_json: NotePoint[] | null;
  };
  conversion: {
    id: string;
    kunkunshi_json: ConversionPoint[];
  } | null;
};

export function SongStatus({ songId }: { songId: string }) {
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const response = await fetch(`/api/transcriptions/${songId}/status`);
      if (!response.ok) {
        throw new Error("Failed to load status");
      }
      setPayload(await response.json());
      setError(null);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unknown error");
    }
  }

  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 2500);
    return () => clearInterval(timer);
  }, [songId]);

  const textExport = useMemo(() => {
    if (!payload?.conversion) return "";
    return payload.conversion.kunkunshi_json
      .map((line) => `${line.start.toFixed(2)}-${line.end.toFixed(2)}\t${line.string}\t${line.symbol}\t${line.noteName}`)
      .join("\n");
  }, [payload]);

  return (
    <>
      <h1>解析ステータス</h1>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {!payload ? <p>読み込み中...</p> : null}
      {payload ? (
        <div className="card">
          <h2>{payload.song.title}</h2>
          <p>Key: {payload.song.key_root}</p>
          <p>Status: {payload.transcription.status}</p>
          {payload.song.audio_url ? <audio controls src={payload.song.audio_url} style={{ width: "100%" }} /> : null}
          {payload.song.youtube_url ? (
            <iframe
              title="youtube"
              width="100%"
              height="280"
              src={buildYoutubeEmbed(payload.song.youtube_url)}
              allow="autoplay; encrypted-media"
            />
          ) : null}
          {payload.transcription.status === "queued" ? <StartButton songId={songId} onDone={loadStatus} /> : null}
          {payload.transcription.error ? <p style={{ color: "crimson" }}>{payload.transcription.error}</p> : null}
        </div>
      ) : null}
      {payload?.conversion ? (
        <div className="card">
          <h2>工工四 + 西洋音名</h2>
          {payload.conversion.kunkunshi_json.map((point) => (
            <div className="kunkunshi-row" key={`${point.start}-${point.end}`}>
              <div>{point.start.toFixed(2)}</div>
              <div>{point.string}</div>
              <strong>{point.symbol}</strong>
              <div>{point.noteName}</div>
            </div>
          ))}
          <h3>テキストエクスポート</h3>
          <textarea readOnly rows={10} style={{ width: "100%" }} value={textExport} />
        </div>
      ) : null}
    </>
  );
}

function StartButton({ songId, onDone }: { songId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    await fetch(`/api/transcriptions/${songId}/start`, { method: "POST" });
    setBusy(false);
    onDone();
  }

  return (
    <button type="button" onClick={start} disabled={busy}>
      {busy ? "ジョブ投入中..." : "解析を開始"}
    </button>
  );
}

function buildYoutubeEmbed(url: string): string {
  const idMatch = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (!idMatch) return "";
  return `https://www.youtube.com/embed/${idMatch[1]}`;
}
