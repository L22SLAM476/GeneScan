import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { analyzeDna, formatPercentage, SAMPLE_SEQUENCE } from "./lib/dna";
import type { DnaAnalysis } from "./lib/dna";
import { api } from "./lib/api";
import type { ApiAnalysis, ApiUser } from "./lib/api";

type HistoryItem = ApiAnalysis;

function App() {
  const [sequenceInput, setSequenceInput] = useState(SAMPLE_SEQUENCE);
  const [analysis, setAnalysis] = useState<DnaAnalysis | null>(() => analyzeDna(SAMPLE_SEQUENCE));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    api.me().then(async ({ user: currentUser }) => {
      if (!active) return;
      setUser(currentUser);
      const saved = await api.analyses();
      if (active) setHistory(saved.analyses);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const gcTone = useMemo(() => {
    if (!analysis) return "balanced";
    if (analysis.gcPercentage >= 60) return "high";
    if (analysis.gcPercentage <= 40) return "low";
    return "balanced";
  }, [analysis]);

  const saveHistory = async (result: DnaAnalysis) => {
    if (!user || !saveToAccount) return;
    try {
      const saved = await api.saveAnalysis(result.sequence);
      setHistory((current) => [saved.analysis, ...current.filter((entry) => entry.id !== saved.analysis.id)].slice(0, 50));
      setNotice("Analysis saved securely to your account.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Analysis completed, but saving failed.");
    }
  };

  const handleAuth = async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = authMode === "register"
        ? await api.register(authName, authEmail, authPassword)
        : await api.login(authEmail, authPassword);
      setUser(result.user);
      setAuthPassword("");
      const saved = await api.analyses();
      setHistory(saved.analyses);
      setNotice("Signed in as " + result.user.name + ".");
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setHistory([]);
      setSaveToAccount(false);
      setNotice("You have been signed out.");
    }
  };

  const runAnalysis = (value = sequenceInput) => {
    try {
      const result = analyzeDna(value);
      setAnalysis(result);
      setSequenceInput(result.sequence);
      setError("");
      setNotice("Sequence analyzed successfully.");
      void saveHistory(result);
    } catch (caught) {
      setAnalysis(null);
      setError(caught instanceof Error ? caught.message : "Unable to analyze this sequence.");
      setNotice("");
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("File is larger than 5 MB. Please choose a smaller FASTA or text file.");
      return;
    }
    try {
      const text = await file.text();
      setSequenceInput(text);
      runAnalysis(text);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("The selected file could not be read.");
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(label + " copied to clipboard.");
    } catch {
      setNotice("Clipboard access is unavailable in this browser.");
    }
  };

  const exportCsv = () => {
    if (!analysis) return;
    const rows = [
      ["Metric", "Value"],
      ["Sequence length (bp)", String(analysis.length)],
      ["GC content (%)", analysis.gcPercentage.toFixed(2)],
      ["AT content (%)", analysis.atPercentage.toFixed(2)],
      ...analysis.composition.map((item) => [item.base + " count", String(item.count)]),
      ...analysis.composition.map((item) => [item.base + " percentage", item.percentage.toFixed(2)]),
      ["Reverse complement", analysis.reverseComplement],
      ["Analyzed at", analysis.analyzedAt],
      ["Sequence", analysis.sequence],
    ];
    const csv = rows.map((row) => row.map((cell) => '"' + cell.replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "genescan-analysis.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("CSV report downloaded.");
  };

  const clearInput = () => {
    setSequenceInput("");
    setAnalysis(null);
    setError("");
    setNotice("");
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setSequenceInput(item.sequence);
    runAnalysis(item.sequence);
  };

  const removeHistoryItem = async (id: string) => {
    try {
      await api.deleteAnalysis(id);
      setHistory((current) => current.filter((entry) => entry.id !== id));
      setNotice("Saved analysis deleted.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not delete saved analysis.");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setNotice("History cleared from this view. Delete individual account records to remove them from the database.");
  };

  const hasAnalysis = analysis !== null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="GeneScan home">
          <span className="brand-mark"><DnaMark /></span>
          <span className="brand-name">gene<span>scan</span><small>SEQUENCE INTELLIGENCE</small></span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>
        <a className="nav-item active" href="#analyzer"><span className="nav-icon">⌁</span> Sequence analyzer</a>
        <a className="nav-item" href="#history"><span className="nav-icon">◷</span> Recent analyses</a>

        <div className="sidebar-bottom">
          <div className="side-status"><span className="status-dot" /> API-ready analysis engine</div>
          <div className="privacy-card">
            <span className="privacy-icon">⌑</span>
            <strong>Your data, your account.</strong>
            <p>Analysis runs in the browser. Sequences are sent to the API only when you choose to save to your account.</p>
          </div>
          <div className="sidebar-foot">GENESCAN <span>·</span> VERSION 1.0</div>
        </div>
      </aside>

      {(authError || authMode === "register") && <div className="auth-scrim" onClick={() => setAuthError("")}>
        <form className="auth-modal panel" onSubmit={(event) => { event.preventDefault(); void handleAuth(); }} onClick={(event) => event.stopPropagation()}>
          <button type="button" className="auth-close" aria-label="Close" onClick={() => setAuthError("")}>×</button>
          <div className="eyebrow"><span /> GENESCAN ACCOUNT</div>
          <h2>{authMode === "register" ? "Create your account" : "Sign in to GeneScan"}</h2>
          <p>Save sequence analyses and access them from your other devices.</p>
          {authMode === "register" && <label>Full name<input required minLength={2} maxLength={60} value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Your name" /></label>}
          <label>Email address<input required type="email" maxLength={254} value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input required type="password" minLength={8} maxLength={72} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          {authError && <div className="alert alert-error" role="alert">{authError}</div>}
          <button className="button button-primary analyze-button" type="submit" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "register" ? "Create account" : "Sign in"} <span>→</span></button>
          <div className="auth-switch">{authMode === "login" ? "New to GeneScan?" : "Already have an account?"} <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Create an account" : "Sign in"}</button></div>
          <div className="auth-privacy">Passwords are hashed by the server. Session cookies are HTTP-only.</div>
        </form>
      </div>}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Sequence analyzer</strong></div>
          <div className="topbar-right"><span className="engine-pill"><i /> API READY</span>
            {user ? <><span className="signed-user">{user.name}</span><button className="text-button" onClick={() => void handleLogout()}>Sign out</button></> : <button className="top-auth-button" onClick={() => { setAuthMode("login"); setAuthError(""); }}>Sign in</button>}
            <span className="avatar">{user ? user.name.slice(0, 2).toUpperCase() : "GS"}</span></div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span /> BIOINFORMATICS TOOLKIT</div>
              <h1>DNA sequence <em>analyzer</em></h1>
              <p>Turn raw nucleotide data into clear, useful sequence insights.</p>
            </div>
            <div className="heading-decoration" aria-hidden="true"><DnaMark /></div>
          </section>

          {!user && <section className="account-banner">
            <div><strong>Keep your research organized.</strong><span>Sign in to save analyses and access your sequence history across sessions.</span></div>
            <button className="button button-secondary" onClick={() => { setAuthMode("register"); setAuthError(""); }}>Create free account →</button>
          </section>}
          {user && <section className="account-banner account-banner-signed">
            <div><strong>Welcome back, {user.name}.</strong><span>Your saved analyses are linked to your GeneScan account.</span></div>
            <label className="save-toggle"><input type="checkbox" checked={saveToAccount} onChange={(event) => setSaveToAccount(event.target.checked)} /> Save new analyses to account</label>
          </section>}
          <section className="workspace-grid" id="analyzer">
            <div className="input-panel panel">
              <div className="panel-heading">
                <div><span className="section-index">01</span><div><h2>Input sequence</h2><p>Paste a DNA sequence or upload a FASTA file.</p></div></div>
                <span className="file-type">FASTA / TXT</span>
              </div>

              <div className={"sequence-drop " + (isDragging ? "dragging" : "")}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => { event.preventDefault(); setIsDragging(false); void handleFile(event.dataTransfer.files?.[0]); }}>
                <textarea
                  aria-label="DNA sequence input"
                  value={sequenceInput}
                  onChange={(event) => { setSequenceInput(event.target.value); setError(""); }}
                  placeholder="Paste your DNA sequence here…"
                  spellCheck={false}
                />
                <div className="input-footer">
                  <span>{sequenceInput.replace(/\s/g, "").length.toLocaleString()} <small>characters</small></span>
                  <button className="text-button" onClick={() => void copyText(sequenceInput, "Sequence")} disabled={!sequenceInput}>Copy input ↗</button>
                </div>
                <div className="drop-overlay"><strong>Drop a FASTA or TXT file</strong><span>Release to load sequence</span></div>
              </div>

              <input ref={fileInputRef} className="visually-hidden" type="file" accept=".fa,.fasta,.fna,.txt,text/plain" onChange={onFileChange} />
              <div className="input-actions">
                <button className="button button-secondary" onClick={() => fileInputRef.current?.click()}><UploadIcon /> Upload FASTA</button>
                <button className="button button-ghost" onClick={() => { setSequenceInput(SAMPLE_SEQUENCE); runAnalysis(SAMPLE_SEQUENCE); }}>Load sample</button>
                <button className="button button-ghost clear-button" onClick={clearInput}>Clear</button>
              </div>

              {error && <div className="alert alert-error" role="alert"><span>!</span>{error}</div>}
              {notice && !error && <div className="alert alert-success" role="status"><span>✓</span>{notice}</div>}
              <button className="button button-primary analyze-button" onClick={() => runAnalysis()} disabled={!sequenceInput.trim()}>
                Analyze sequence <span>→</span>
              </button>
              <div className="input-hint"><span>ⓘ</span> Valid DNA bases: A, T, G and C. Whitespace is ignored.</div>
              {user && <div className="save-consent"><label><input type="checkbox" checked={saveToAccount} onChange={(event) => setSaveToAccount(event.target.checked)} /> I agree to save this sequence and its analysis in my account.</label></div>}
            </div>

            <div className="results-column">
              <div className="results-head">
                <div><span className="section-index">02</span><div><h2>Analysis overview</h2><p>Core metrics from your sequence.</p></div></div>
                {hasAnalysis && <button className="export-button" onClick={exportCsv}><DownloadIcon /> Export CSV</button>}
              </div>

              {analysis ? (
                <>
                  <div className="metric-grid">
                    <MetricCard label="Sequence length" value={analysis.length.toLocaleString()} unit="bp" detail="Total nucleotide bases" icon="↔" />
                    <MetricCard label="GC content" value={formatPercentage(analysis.gcPercentage)} unit="" detail="Guanine + cytosine" icon="◒" tone={gcTone} />
                    <MetricCard label="AT content" value={formatPercentage(analysis.atPercentage)} unit="" detail="Adenine + thymine" icon="⌁" />
                  </div>

                  <div className="panel composition-panel">
                    <div className="card-title-row"><div><h3>Nucleotide composition</h3><p>Distribution across the sequence</p></div><span className="mini-tag">4 BASES</span></div>
                    <div className="composition-bar" role="img" aria-label={"Nucleotide composition: " + analysis.composition.map((item) => item.base + " " + item.percentage.toFixed(1) + "%").join(", ")}>
                      {analysis.composition.map((item) => <span key={item.base} style={{ width: item.percentage + "%", background: item.color }} />)}
                    </div>
                    <div className="base-grid">
                      {analysis.composition.map((item) => (
                        <div className="base-item" key={item.base}>
                          <div className="base-top"><span className="base-symbol" style={{ background: item.color }}>{item.base}</span><strong>{item.count.toLocaleString()}</strong></div>
                          <div className="base-percent">{formatPercentage(item.percentage)}</div>
                          <div className="base-track"><span style={{ width: item.percentage + "%", background: item.color }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel reverse-panel">
                    <div className="card-title-row"><div><h3>Reverse complement</h3><p>Complementary strand in reverse orientation</p></div><button className="text-button" onClick={() => void copyText(analysis.reverseComplement, "Reverse complement")}>Copy ↗</button></div>
                    <div className="reverse-sequence">{analysis.reverseComplement.match(/.{1,10}/g)?.join(" ")}</div>
                    <div className="reverse-meta"><span><i className="tiny-dot" /> A ↔ T <span className="meta-divider">·</span> G ↔ C</span><span>{analysis.length.toLocaleString()} bp</span></div>
                  </div>

                  <div className="report-row"><span>Analysis completed <strong>{new Date(analysis.analyzedAt).toLocaleString()}</strong></span><button className="text-button" onClick={() => window.print()}>Print report ↗</button></div>
                </>
              ) : (
                <div className="empty-results panel"><div className="empty-icon"><DnaMark /></div><h3>Results will appear here</h3><p>Enter a DNA sequence and select <strong>Analyze sequence</strong> to calculate its composition and GC content.</p></div>
              )}
            </div>
          </section>

          <section className="history-section panel" id="history">
            <div className="card-title-row">
              <div><div className="history-title"><span className="section-index">03</span><h2>Recent analyses</h2></div><p>{user ? "Your account's saved analysis records." : "Sign in to save analyses and build a personal history."}</p></div>
              {history.length > 0 && <button className="text-button" onClick={clearHistory}>Clear history</button>}
            </div>
            {history.length > 0 ? (
              <div className="history-list">
                {history.map((item) => (
                  <div className="history-item" key={item.id}>
                    <button className="history-item-main" onClick={() => loadHistoryItem(item)}>
                      <span className="history-symbol">DNA</span>
                      <span className="history-seq"><strong>{item.sequence.slice(0, 24)}{item.sequence.length > 24 ? "…" : ""}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span>
                      <span className="history-stat"><strong>{item.sequenceLength.toLocaleString()} bp</strong><small>Length</small></span>
                      <span className="history-stat"><strong>{formatPercentage(item.gcPercentage)}</strong><small>GC content</small></span>
                    </button>
                    {user && <button className="history-delete" aria-label="Delete saved analysis" onClick={() => void removeHistoryItem(item.id)}>×</button>}
                  </div>
                ))}
              </div>
            ) : <div className="history-empty">No saved analyses yet. Run an analysis to add it here.</div>}
          </section>

          <footer className="page-footer">
            <span>© 2026 GeneScan <i /> Built for learning and sequence exploration.</span>
            <span>DNA ANALYSIS <i /> CONSENT-BASED ACCOUNT STORAGE</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, unit, detail, icon, tone = "" }: {
  label: string; value: string; unit: string; detail: string; icon: string; tone?: string;
}) {
  return (
    <div className={"metric-card panel " + tone}>
      <div className="metric-top"><span>{label}</span><i>{icon}</i></div>
      <div className="metric-value">{value}<small>{unit}</small></div>
      <div className="metric-detail"><span />{detail}</div>
    </div>
  );
}

function DnaMark() {
  return (
    <svg viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M12 5C12 15 32 29 32 39M32 5C32 15 12 29 12 39" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 11H30M17 18H27M17 26H27M14 33H30" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 5C12 15 32 29 32 39M32 5C32 15 12 29 12 39" stroke="url(#dnaGradient)" strokeWidth="2.2" strokeLinecap="round" />
      <defs><linearGradient id="dnaGradient" x1="12" y1="5" x2="32" y2="39"><stop stopColor="#55D7B5"/><stop offset="1" stopColor="#6D9BFF"/></linearGradient></defs>
    </svg>
  );
}

function UploadIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M3.5 12.5v3A1.5 1.5 0 005 17h10a1.5 1.5 0 001.5-1.5v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function DownloadIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v9m0 0l3.5-3.5M10 12L6.5 8.5M3.5 13.5v2A1.5 1.5 0 005 17h10a1.5 1.5 0 001.5-1.5v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default App;
