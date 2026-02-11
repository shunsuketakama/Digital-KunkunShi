"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const keys = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export function SongForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [keyRoot, setKeyRoot] = useState("C");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title || "Untitled song");
      formData.append("keyRoot", keyRoot);
      formData.append("youtubeUrl", youtubeUrl);
      if (audio) {
        formData.append("audio", audio);
      }

      const response = await fetch("/api/songs", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to create song");
      }

      const data = await response.json();
      router.push(`/song/${data.songId}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>入力</h2>
      <label>
        タイトル
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="My pop song" />
      </label>
      <label>
        Key
        <select value={keyRoot} onChange={(event) => setKeyRoot(event.target.value)}>
          {keys.map((key) => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </label>
      <label>
        音源アップロード (mp3/wav)
        <input
          type="file"
          accept="audio/mpeg,audio/wav,audio/x-wav"
          onChange={(event) => setAudio(event.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        YouTube URL (埋め込みのみ)
        <input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
      </label>
      <button type="submit" disabled={isSubmitting || !audio}>
        {isSubmitting ? "送信中..." : "解析ジョブ作成"}
      </button>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </form>
  );
}
