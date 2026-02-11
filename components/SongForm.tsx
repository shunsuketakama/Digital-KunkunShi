"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const keys = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function SongForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [keyRoot, setKeyRoot] = useState("C");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isRecording, setRecording] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordingSupported, setRecordingSupported] = useState(true);

  const selectedAudio = recordedFile ?? audio;

  useEffect(() => {
    setRecordingSupported(typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title || "Untitled song");
      formData.append("keyRoot", keyRoot);
      formData.append("youtubeUrl", youtubeUrl);
      if (selectedAudio) {
        formData.append("audio", selectedAudio);
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

  async function startRecording() {
    setError(null);
    try {
      if (!recordingSupported) {
        throw new Error("このブラウザは録音に対応していません");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        setRecordedFile(file);
        setAudio(null);
        if (recordedUrl) {
          URL.revokeObjectURL(recordedUrl);
        }
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "録音の開始に失敗しました");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>入力</h2>
      {!hasSupabaseEnv ? <p style={{ color: "crimson" }}>Supabase 環境変数が不足しています。`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定してください。</p> : null}
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
          onChange={(event) => {
            setAudio(event.target.files?.[0] ?? null);
            setRecordedFile(null);
            if (recordedUrl) {
              URL.revokeObjectURL(recordedUrl);
              setRecordedUrl(null);
            }
          }}
        />
      </label>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "8px 0" }}>録音（マイク入力）</h3>
        <p style={{ marginTop: 0 }}>録音はブラウザのマイク入力を使用します。YouTube の動画/音声はダウンロード・抽出しません。</p>
        <button type="button" onClick={startRecording} disabled={isRecording || !recordingSupported}>録音開始</button>{" "}
        <button type="button" onClick={stopRecording} disabled={!isRecording || !recordingSupported}>録音停止</button>
        {!recordingSupported ? <p style={{ color: "crimson", marginBottom: 0 }}>このブラウザでは録音機能を利用できません。</p> : null}
      </div>
      {recordedUrl ? <audio controls src={recordedUrl} style={{ width: "100%", marginBottom: 12 }} /> : null}
      <label>
        YouTube URL (埋め込みのみ)
        <input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
      </label>
      <button type="submit" disabled={isSubmitting || !selectedAudio || !hasSupabaseEnv}>
        {isSubmitting ? "送信中..." : recordedFile ? "この録音を解析" : "解析ジョブ作成"}
      </button>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </form>
  );
}
