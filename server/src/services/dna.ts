export type Nucleotide = "A" | "T" | "G" | "C";

export interface DnaResult {
  sequence: string;
  sequenceLength: number;
  adenineCount: number;
  thymineCount: number;
  guanineCount: number;
  cytosineCount: number;
  gcPercentage: number;
  atPercentage: number;
  reverseComplement: string;
}

const complement: Record<Nucleotide, Nucleotide> = {
  A: "T",
  T: "A",
  G: "C",
  C: "G",
};

export function normalizeDnaInput(input: string): string {
  const value = input.trim();
  if (!value) throw new Error("A DNA sequence is required.");

  const lines = value.split(/\r?\n/);
  const headers = lines.filter((line) => line.trim().startsWith(">"));
  if (headers.length > 1) throw new Error("Only one FASTA record can be analyzed at a time.");

  const raw = headers.length
    ? lines.filter((line) => !line.trim().startsWith(">")).join("")
    : value;
  const sequence = raw.replace(/\s/g, "").toUpperCase();

  if (!sequence) throw new Error("The input does not contain any DNA bases.");
  if (sequence.length > 1_000_000) throw new Error("The maximum supported sequence length is 1,000,000 bases.");

  const invalid = [...new Set(sequence.match(/[^ATGC]/g) ?? [])];
  if (invalid.length) {
    throw new Error(`Unsupported DNA character(s): ${invalid.slice(0, 10).join(", ")}. Use only A, T, G and C.`);
  }

  return sequence;
}

export function analyzeDna(input: string): DnaResult {
  const sequence = normalizeDnaInput(input);
  let adenineCount = 0;
  let thymineCount = 0;
  let guanineCount = 0;
  let cytosineCount = 0;

  for (const nucleotide of sequence) {
    switch (nucleotide) {
      case "A": adenineCount += 1; break;
      case "T": thymineCount += 1; break;
      case "G": guanineCount += 1; break;
      case "C": cytosineCount += 1; break;
    }
  }

  const sequenceLength = sequence.length;
  const gcCount = guanineCount + cytosineCount;
  const atCount = adenineCount + thymineCount;
  const reverseComplement = Array.from(sequence).reverse()
    .map((base) => complement[base as Nucleotide]).join("");

  return {
    sequence,
    sequenceLength,
    adenineCount,
    thymineCount,
    guanineCount,
    cytosineCount,
    gcPercentage: (gcCount / sequenceLength) * 100,
    atPercentage: (atCount / sequenceLength) * 100,
    reverseComplement,
  };
}
