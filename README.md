# GeneScan — DNA Sequence Analyzer

GeneScan is a lightweight bioinformatics application for analyzing DNA sequences on the web and Android.

## Features
- Paste DNA sequences or upload FASTA files
- Validate DNA alphabet (A, T, G, C; whitespace ignored)
- Calculate sequence length, nucleotide counts and percentages
- Calculate GC content
- Generate reverse complement
- View nucleotide composition charts
- Export analysis results as CSV and printable report
- Keep recent analyses locally on the device/browser

## Technology
- React + TypeScript + Vite
- Capacitor Android wrapper
- Android Studio / Gradle for APK builds

## Run the web app
```bash
npm install
npm run dev
```

## Build Android
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

On Windows use `gradlew.bat assembleDebug`. The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Biology note
GC content is calculated as `(G + C) / sequence length × 100`. Reverse complement is calculated using A↔T and G↔C, then reversing the complemented sequence. This is a sequence utility, not a clinical diagnostic tool.
