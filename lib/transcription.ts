import type { NotePoint } from "@/lib/types";
import { generateDummyNotes } from "@/lib/music";

export async function extractMelodyFromAudio(_audioBytes: Uint8Array): Promise<NotePoint[]> {
  // MVP: dummy output. Replace with real pitch tracking (CREPE/Essentia/etc) in production.
  return generateDummyNotes();
}
