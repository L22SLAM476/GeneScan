export type Base = "A" | "T" | "G" | "C";

export interface BaseCount {
  base: Base;
  count: number;
  percentage: number;
  color: string;
}

export interface DnaAnalysis {
  sequence: string;
  length: number;
  gcCount: number;
  gcPercentage: number;
  atPercentage: number;
  reverseComplement: string;
  composition: BaseCount[];
  analyzedAt: string;
}

export const SAMPLE_SEQUENCE =
  "ATGCGTACGTTAGCTAGCGATCGATGCTAGCTAGGCTAACGTTAGCGATCGATGCGTACGATCG";

const BASES: Base[] = ["A", "T", "G", "C"];
const COLORS: Record<Base, string> = {
  A: "#43c6a6", T: "#f0b85e", G: "#719cf4", C: "#b08af0",
};
const COMPLEMENT: Record<Base, Base> = { A: "T", T: "A", G: "C", C: "G" };

export function cleanDnaInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Paste a DNA sequence or upload a FASTA file to begin.");

  const lines = trimmed.split(/\r?\n/);
  const headers = lines.filter((line) => line.trim().startsWith(">"));
  if (headers.length > 1) throw new Error("Please provide one FASTA record at a time.");

  const raw = headers.length
    ? lines.filter((line) => !line.trim().startsWith(">")).join("")
    : trimmed;
  const sequence = raw.replace(/\s/g, "").toUpperCase();

  if (!sequence) throw new Error("No DNA bases were found.");
  if (sequence.length > 1000000) throw new Error("Sequence is too large. Maximum supported length is 1,000,000 bases.");

  const invalid = [...new Set(sequence.match(/[^ATGC]/g) ?? [])];
  if (invalid.length) {
    throw new Error("Unsupported character(s): " + invalid.slice(0, 8).join(", ") + ". Use only A, T, G and C.");
  }
  return sequence;
}

export function analyzeDna(input: string): DnaAnalysis {
  const sequence = cleanDnaInput(input);
  const counts: Record<Base, number> = { A: 0, T: 0, G: 0, C: 0 };
  for (const nucleotide of sequence) counts[nucleotide as Base] += 1;

  const length = sequence.length;
  const gcCount = counts.G + counts.C;
  const composition = BASES.map((base) => ({
    base, count: counts[base], percentage: (counts[base] / length) * 100, color: COLORS[base],
  }));
  const reverseComplement = [...sequence].reverse()
    .map((base) => COMPLEMENT[base as Base]).join("");

  return {
    sequence, length, gcCount, gcPercentage: (gcCount / length) * 100,
    atPercentage: ((counts.A + counts.T) / length) * 100,
    reverseComplement, composition, analyzedAt: new Date().toISOString(),
  };
}

export function formatPercentage(value: number): string {
  return value.toFixed(2) + "%";
}
