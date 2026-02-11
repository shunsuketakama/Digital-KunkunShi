import type { ConversionPoint, NotePoint } from "@/lib/types";

type StringName = "male" | "middle" | "female";
type SymbolName = ConversionPoint["symbol"];

const symbols: SymbolName[] = ["工", "四", "五", "六", "七", "八", "九", "尺"];
const semitoneToName = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const stringOpenMidi: Record<StringName, number> = {
  male: 48,
  middle: 53,
  female: 60
};

const intervals: Record<StringName, number[]> = {
  male: [0, 2, 4, 5, 7, 9, 11, 12],
  middle: [0, 2, 4, 5, 7, 9, 11, 12],
  female: [0, 2, 4, 5, 7, 9, 11, 12]
};

const keyOffsets: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
};

type Candidate = {
  string: StringName;
  symbol: SymbolName;
  degree: number;
  noteName: string;
  confidence: number;
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): string {
  const note = semitoneToName[(midi % 12 + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export function generateDummyNotes(durationSec = 8): NotePoint[] {
  const base = [60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60];
  return base.map((midi, i) => ({
    start: i * (durationSec / base.length),
    end: (i + 1) * (durationSec / base.length),
    midi,
    hz: midiToFreq(midi),
    confidence: i % 4 === 0 ? 0.65 : 0.89
  }));
}

function transposeMidiForKey(midi: number, keyRoot: string): number {
  const offset = keyOffsets[keyRoot] ?? 0;
  return midi + offset;
}

function buildCandidates(midi: number, confidence: number): Candidate[] {
  const out: Candidate[] = [];
  for (const string of Object.keys(stringOpenMidi) as StringName[]) {
    const base = stringOpenMidi[string];
    intervals[string].forEach((delta, i) => {
      const candidateMidi = base + delta;
      if (candidateMidi === midi) {
        out.push({ string, symbol: symbols[i], degree: i, noteName: midiToNoteName(midi), confidence });
      }
      if (string === "female" && candidateMidi + 12 === midi) {
        out.push({ string, symbol: symbols[i], degree: i, noteName: midiToNoteName(midi), confidence });
      }
    });
  }
  return out;
}

function stepCost(prev: Candidate | null, current: Candidate, midi: number): number {
  let cost = 0;
  if (prev && prev.string !== current.string) {
    cost += 2;
  }
  if (prev) {
    cost += Math.abs(prev.degree - current.degree);
  }
  if (current.confidence < 0.7) {
    cost += 1;
  }
  if (midi >= 69 && current.string === "male") {
    cost += 1;
  }
  if (midi <= 55 && current.string === "female") {
    cost += 1;
  }
  return cost;
}

export function convertToKunkunshi(notes: NotePoint[], keyRoot = "C"): ConversionPoint[] {
  const notesInKey = notes.map((note) => ({
    ...note,
    midi: transposeMidiForKey(note.midi, keyRoot)
  }));

  const layers = notesInKey.map((note) => {
    const candidates = buildCandidates(note.midi, note.confidence);
    if (candidates.length > 0) {
      return candidates;
    }
    const closest = buildCandidates(note.midi + 12, note.confidence);
    if (closest.length > 0) {
      return closest;
    }
    return [{
      string: "male" as const,
      symbol: "工" as const,
      degree: 0,
      noteName: midiToNoteName(note.midi),
      confidence: note.confidence
    }];
  });

  const dp: number[][] = layers.map((layer) => layer.map(() => Number.POSITIVE_INFINITY));
  const prev: number[][] = layers.map((layer) => layer.map(() => -1));

  layers[0].forEach((candidate, i) => {
    dp[0][i] = stepCost(null, candidate, notesInKey[0].midi);
  });

  for (let i = 1; i < layers.length; i += 1) {
    for (let j = 0; j < layers[i].length; j += 1) {
      for (let k = 0; k < layers[i - 1].length; k += 1) {
        const nextCost = dp[i - 1][k] + stepCost(layers[i - 1][k], layers[i][j], notesInKey[i].midi);
        if (nextCost < dp[i][j]) {
          dp[i][j] = nextCost;
          prev[i][j] = k;
        }
      }
    }
  }

  let bestIndex = 0;
  let bestCost = Number.POSITIVE_INFINITY;
  dp[dp.length - 1].forEach((value, idx) => {
    if (value < bestCost) {
      bestCost = value;
      bestIndex = idx;
    }
  });

  const sequence: Candidate[] = [];
  let layerIndex = layers.length - 1;
  let cursor = bestIndex;
  while (layerIndex >= 0) {
    sequence.unshift(layers[layerIndex][cursor]);
    cursor = prev[layerIndex][cursor];
    layerIndex -= 1;
    if (cursor < 0 && layerIndex >= 0) {
      cursor = 0;
    }
  }

  return sequence.map((chosen, index) => ({
    start: notes[index].start,
    end: notes[index].end,
    string: chosen.string,
    symbol: chosen.symbol,
    display: `${chosen.symbol} (${chosen.noteName})`,
    confidence: notes[index].confidence,
    noteName: chosen.noteName
  }));
}
