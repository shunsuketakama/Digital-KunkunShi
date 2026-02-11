export type SourceType = "upload" | "record" | "youtube";

export type Song = {
  id: string;
  user_id: string;
  title: string;
  source_type: SourceType;
  youtube_url: string | null;
  audio_path: string | null;
  key_root: string;
  created_at: string;
};

export type TranscriptionStatus = "queued" | "processing" | "done" | "failed";

export type NotePoint = {
  start: number;
  end: number;
  midi: number;
  hz: number;
  confidence: number;
};

export type ConversionPoint = {
  start: number;
  end: number;
  string: "male" | "middle" | "female";
  symbol: "工" | "四" | "五" | "六" | "七" | "八" | "九" | "尺";
  display: string;
  confidence: number;
  noteName: string;
};
