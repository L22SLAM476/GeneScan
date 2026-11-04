# GeneScan — DNA Sequence Analyzer

GeneScan is a browser-based bioinformatics utility for introductory DNA sequence analysis. The current first milestone is the web application; Android packaging and expanded automated testing are planned as later milestones.

## Current web features

- Paste a DNA sequence or upload one FASTA/TXT record
- Validate the sequence against the DNA alphabet (A, T, G, C)
- Ignore whitespace and normalize lowercase input
- Calculate sequence length, nucleotide counts and percentages
- Calculate GC content and AT content
- Generate the reverse complement
- View nucleotide composition bars
- Export results as CSV and print a report
- Keep up to eight recent analyses in browser local storage

## Tech stack

- React 19 + TypeScript
- Vite 8
- Capacitor configuration reserved for a later Android milestone

## Run locally

Node.js 24 or newer is recommended.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Android milestone (not yet generated)

The Capacitor configuration is present. After the web app is finalized, install/sync the Android platform and build with Gradle:

```bash
npm install
npx cap add android
npm run android:sync
cd android
./gradlew assembleDebug
```

On Windows, use `gradlew.bat assembleDebug`. The debug APK is expected at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Calculation notes

- GC content = `(G + C) / sequence length × 100`
- AT content = `(A + T) / sequence length × 100`
- Complement rules: `A ↔ T` and `G ↔ C`; the reverse complement reverses the complemented sequence.
- This version accepts unambiguous DNA bases only (A, T, G, C). Ambiguous IUPAC symbols and RNA bases are not currently supported.

## Privacy and intended use

Sequence analysis is performed in the browser. The application does not currently send input sequences to a backend. Recent history is stored locally in the browser/device. GeneScan is an educational sequence utility, not a clinical diagnostic or medical decision-making system.

## Build validation

GitHub Actions runs a production type-check/build on pushes and pull requests targeting `main`. See `.github/workflows/web-build.yml`.
