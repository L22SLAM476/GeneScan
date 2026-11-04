import test from "node:test";
import assert from "node:assert/strict";
import { analyzeDna, normalizeDnaInput } from "./dna.js";

test("calculates length, composition and GC content", () => {
  const result = analyzeDna("ATGCGCATTA");
  assert.equal(result.sequenceLength, 10);
  assert.equal(result.adenineCount, 3);
  assert.equal(result.thymineCount, 3);
  assert.equal(result.guanineCount, 2);
  assert.equal(result.cytosineCount, 2);
  assert.equal(result.gcPercentage, 40);
});

test("generates the reverse complement", () => {
  assert.equal(analyzeDna("ATGCGCATTA").reverseComplement, "TAATGCGCAT");
});

test("normalizes whitespace, lowercase and single-record FASTA input", () => {
  assert.equal(normalizeDnaInput(">sample sequence\natgc\n cgt "), "ATGCCGT");
});

test("rejects empty input", () => {
  assert.throws(() => analyzeDna("  "), /required/i);
});

test("rejects unsupported symbols", () => {
  assert.throws(() => analyzeDna("ATGCN"), /Unsupported DNA character/);
});

test("rejects multiple FASTA records", () => {
  assert.throws(() => normalizeDnaInput(">one\nATGC\n>two\nTTAA"), /one FASTA record/i);
});
