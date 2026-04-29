/* global React */
const { useState: useStateF } = React;

// ---------- shared mini ----------
function FStatusPill({ kind, label }) {
  const map = {
    "below": { cls: "status-below", text: label || "기준 미달" },
    "met":   { cls: "status-met",   text: label || "기준 도달" },
    "note":  { cls: "status-note",  text: label || "참고" },
  };
  const m = map[kind];
  if (!m) return null;
  return <span className={`status-pill ${m.cls}`}>{m.text}</span>;
}

function FDirection({ kind, label }) {
  const map = {
    "down-good":  { arrow: "↓", text: "낮을수록 좋음" },
    "up-good":    { arrow: "↑", text: "높을수록 좋음" },
    "neutral":    { arrow: "—", text: "참고" },
  };
  const m = map[kind] || map.neutral;
  return (
    <span className="dir-pill" style={{ color: "var(--ink-2)", background: "var(--bg-sunken)" }}>
      <span className="dir-arrow">{m.arrow}</span>
      <span>{label || m.text}</span>
    </span>
  );
}

function FSection({ id, field, title, status, direction, primary, children }) {
  const cls = status?.kind === "below" ? " below" : status?.kind === "met" ? " met" : "";
  return (
    <section className={`csect${cls}`} id={id}>
      <header className="csect-head">
        <div className="csect-title-row">
          <h3>{title}</h3>
          <span className="csect-field mono">{field}</span>
          <span className="spacer" />
          {status && <FStatusPill kind={status.kind} label={status.label} />}
          {direction && <FDirection kind={direction.kind} label={direction.label} />}
        </div>
      </header>
      <div className="csect-body">{children}</div>
    </section>
  );
}

function FNote({ children }) {
  return (
    <div className="fnote">
      <span className="fnote-icon">ⓘ</span>
      <span>{children}</span>
    </div>
  );
}

function FDisclosure({ summary, count, children, defaultOpen }) {
  const [open, setOpen] = useStateF(!!defaultOpen);
  return (
    <div className={`disc${open ? " open" : ""}`}>
      <button className="disc-toggle" onClick={() => setOpen(o => !o)}>
        <span className="caret">{open ? "▾" : "▸"}</span>
        <span>{summary}</span>
        {count != null && <span className="disc-count mono">{count}</span>}
      </button>
      {open && <div className="disc-body">{children}</div>}
    </div>
  );
}

// ---------- 측정 범위 (헤더) ----------
function MeasurementScope({ d }) {
  const [open, setOpen] = useStateF(false);
  const ms = d.measurementScope;
  if (!ms) return null;
  return (
    <div className="ftab-scope">
      <div className="ftab-scope-line">
        <span className="mono dim">측정</span>
        <span className="mono">{d.stamp || "2026-04-24"}</span>
        <span className="dim sep">·</span>
        <span>도메인 파일 <span className="mono">{ms.domainFiles}</span>개 ({ms.domainNames.join(" / ")})</span>
        <span className="dim sep">·</span>
        <button className="scope-toggle" onClick={() => setOpen(o => !o)}>
          <span className="caret">{open ? "▾" : "▸"}</span>
          측정 대상 프레임 {ms.frames.length}개 보기
        </button>
      </div>
      {open && (
        <ul className="ftab-scope-list">
          {ms.frames.map((f, i) => (
            <li key={i} className="mono">{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- A1: 통합 DS 토큰 매칭률 ----------
function TokenMatchSection({ d }) {
  const stats = d.dsStats;
  const newS = stats["ds-new"];
  const legacyS = stats["ds-legacy"];
  const newRatio = newS.matchedWithCode / newS.total;
  const newPct = (newRatio * 100).toFixed(1);
  const legacyRatio = legacyS.matchedWithCode / legacyS.total;
  const legacyPct = (legacyRatio * 100).toFixed(1);

  return (
    <FSection
      id="token-match"
      field="figma.tokenMatrix.summary.dsStats"
      title="DS 토큰 매칭률 (Styles + Variables)"
      status={{ kind: "below", label: `기준 미달 · ${newS.matchedWithCode}/${newS.total}` }}
      direction={{ kind: "up-good" }}
    >
      {/* primary big number */}
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono" style={{ color: "var(--bad-ink)" }}>{newPct}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">
            <strong>Primary (ds-new)</strong> · {newS.matchedWithCode} / {newS.total}
          </div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">측정 범위</span>
            <span className="v">Styles 만</span>
          </div>
          <div className="kv-row">
            <span className="k">Primary (ds-new)</span>
            <span className="v mono">{newS.matchedWithCode} / {newS.total}</span>
          </div>
          <div className="kv-row">
            <span className="k">참고 (ds-legacy)</span>
            <span className="v mono">{legacyS.matchedWithCode} / {legacyS.total}</span>
          </div>
        </div>
      </div>

      {/* per-DS rows */}
      <div className="csect-subhead">
        <h4>DS 별 매칭률</h4>
        <span className="csect-field mono">dsStats[label]</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {/* ds-new */}
        <div className="ds-token-row" style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 120px 90px",
          alignItems: "center",
          gap: 14,
          padding: "12px 14px",
          borderRadius: 6,
          background: "var(--bg-sunken)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--bad)",
        }}>
          <div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>ds-new</div>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500, marginTop: 2 }}>기준</div>
          </div>
          <div className="bar-track" style={{ margin: 0 }}>
            <div className="bar-track-fill" style={{ width: `${newRatio * 100}%`, background: "var(--bad)" }} />
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--ink-2)", textAlign: "right" }}>
            {newS.matchedWithCode} / {newS.total}
          </div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--bad-ink)", textAlign: "right" }}>
            {newPct}%
          </div>
        </div>

        {/* ds-legacy */}
        <div className="ds-token-row" style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 120px 90px",
          alignItems: "center",
          gap: 14,
          padding: "12px 14px",
          borderRadius: 6,
          background: "var(--bg-sunken)",
          border: "1px solid var(--border)",
        }}>
          <div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>ds-legacy</div>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500, marginTop: 2 }}>참고</div>
          </div>
          <div className="bar-track" style={{ margin: 0 }}>
            <div className="bar-track-fill" style={{ width: `${legacyRatio * 100}%`, background: "var(--good)" }} />
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--ink-2)", textAlign: "right" }}>
            {legacyS.matchedWithCode} / {legacyS.total}
          </div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--good-ink)", textAlign: "right" }}>
            {legacyPct}%
          </div>
        </div>
      </div>

      <FNote>
        현재 측정 범위: <strong>Styles 만</strong>. Variables API 는 Enterprise plan 미보유로 조회 불가 — 다음 측정 시 plan 변경 시 자동 포함.
      </FNote>
    </FSection>
  );
}

// ---------- A2: 토큰 매트릭스 105행 ----------
function TokenMatrixSection({ d }) {
  const tm = d.tokenMatrix;
  if (!tm) return null;
  const { rows, duplicates, summary } = tm;
  const dsLabels = ["ds-new", "ds-legacy"];

  return (
    <FSection
      id="token-matrix"
      field="figma.tokenMatrix.rows"
      title={`토큰 매트릭스 (${rows.length} 행)`}
      status={{ kind: "note" }}
      direction={{ kind: "neutral" }}
    >
      {/* distribution summary */}
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono">{rows.length}</div>
          <div className="kv-unit">행</div>
          <div className="kv-cap">code · ds 합집합 (중복 제거)</div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">code + DS 양쪽 매칭</span>
            <span className="v mono">{summary.both}</span>
          </div>
          <div className="kv-row">
            <span className="k">code 만 (DS 미등록)</span>
            <span className="v mono">{summary.codeOnly}</span>
          </div>
          <div className="kv-row">
            <span className="k">DS 만 (코드 미사용)</span>
            <span className="v mono">{summary.dsOnly}</span>
          </div>
        </div>
      </div>

      {/* mini stack bar */}
      <div className="stack-bar" style={{ display: "flex", height: 12, borderRadius: 4, overflow: "hidden", marginTop: 4, background: "var(--bg-sunken)" }}>
        <div title={`code+DS 양쪽: ${summary.both}`} style={{ width: `${(summary.both/rows.length)*100}%`, background: "var(--good)" }} />
        <div title={`code 만: ${summary.codeOnly}`} style={{ width: `${(summary.codeOnly/rows.length)*100}%`, background: "var(--warn)" }} />
        <div title={`DS 만: ${summary.dsOnly}`} style={{ width: `${(summary.dsOnly/rows.length)*100}%`, background: "var(--ink-4)" }} />
      </div>
      <div className="bar-track-legend" style={{ marginTop: 6 }}>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--good)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />양쪽 {summary.both}</span>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--warn)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />code 만 {summary.codeOnly}</span>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--ink-4)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />DS 만 {summary.dsOnly}</span>
      </div>

      <FDisclosure summary={`전체 ${rows.length} 행 매트릭스 펼치기`} count={rows.length}>
        <div className="token-matrix-wrap">
          <table className="ftable token-matrix-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>토큰명</th>
                <th style={{ width: 70, textAlign: "center" }}>code</th>
                {dsLabels.map(l => (
                  <th key={l} style={{ width: 90, textAlign: "center" }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const inCode = r.c === 1;
                const inNew = r.dn === 1;
                const inLegacy = r.dl === 1;
                const both = inCode && (inNew || inLegacy);
                return (
                  <tr key={r.n}>
                    <td className="mono dim">{i + 1}</td>
                    <td className="mono" style={{ color: both ? "var(--ink)" : "var(--ink-2)" }}>{r.n}</td>
                    <td style={{ textAlign: "center", color: inCode ? "var(--good-ink)" : "var(--ink-4)" }}>
                      {inCode ? "✓" : "−"}
                    </td>
                    <td style={{ textAlign: "center", color: inNew ? "var(--good-ink)" : "var(--ink-4)" }}>
                      {inNew ? "✓" : "−"}
                    </td>
                    <td style={{ textAlign: "center", color: inLegacy ? "var(--good-ink)" : "var(--ink-4)" }}>
                      {inLegacy ? "✓" : "−"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FDisclosure>

      {duplicates && duplicates.length > 0 && (
        <FNote>
          <strong>DS 내 동명 중복 {duplicates.length}건</strong>:{" "}
          {duplicates.map((dup, i) => (
            <React.Fragment key={i}>
              <span className="mono">{dup.name}</span>
              <span style={{ color: "var(--ink-4)", fontSize: 11 }}> ({dup.ds}, ×{dup.count})</span>
              {i < duplicates.length - 1 && <span style={{ color: "var(--ink-4)" }}>, </span>}
            </React.Fragment>
          ))}
        </FNote>
      )}
    </FSection>
  );
}

// ---------- (통합) DS 피그마 Instance 비중 ----------
function DsInstanceShareSection({ d }) {
  const newCnt = d.instanceSources["ds-new"];
  const legacyCnt = d.instanceSources["ds-legacy"];
  const unmatched = d.unmatchedInstances;
  const total = newCnt + legacyCnt + unmatched;
  const newRatio = newCnt / total;
  const legacyRatio = legacyCnt / total;
  const unmatchedRatio = unmatched / total;
  const newPct = (newRatio * 100).toFixed(1);
  const legacyPct = (legacyRatio * 100).toFixed(1);
  const unmatchedPct = (unmatchedRatio * 100).toFixed(1);

  const rows = [
    { k: "ds-new",    v: newCnt,    pct: newPct,       color: "var(--accent)", primary: false, note: "기준" },
    { k: "ds-legacy", v: legacyCnt, pct: legacyPct,    color: "var(--ink-3)",  primary: false, note: "참고 · 장기 감소 기대" },
    { k: "unmatched", v: unmatched, pct: unmatchedPct, color: "var(--bad)",    primary: false, note: "DS 범위 밖" },
  ];

  return (
    <FSection
      id="ds-instance-share"
      field="figma.instanceSources"
      title="DS 피그마 Instance 비중"
      status={{ kind: "below", label: "기준 미달 · 목표 ↑" }}
      direction={{ kind: "up-good" }}
    >
      {/* primary big number */}
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono" style={{ color: "var(--bad-ink)" }}>{newPct}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">
            <strong>Primary (ds-new)</strong> · {newCnt.toLocaleString()} / {total.toLocaleString()}
          </div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">전체 instance</span>
            <span className="v mono">{total.toLocaleString()}</span>
          </div>
          <div className="kv-row">
            <span className="k">목표</span>
            <span className="v mono">100% (장기)</span>
          </div>
        </div>
      </div>

      {/* per-DS rows */}
      <div className="csect-subhead">
        <h4>DS 별 비중</h4>
        <span className="csect-field mono">instanceSources + unmatched</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {rows.map(r => (
          <div key={r.k} className="ds-token-row" style={{
            display: "grid",
            gridTemplateColumns: "200px 1fr 130px 90px",
            alignItems: "center",
            gap: 14,
            padding: "12px 14px",
            borderRadius: 6,
            background: "var(--bg-sunken)",
            border: "1px solid var(--border)",
            borderLeft: r.primary ? "3px solid var(--bad)" : "1px solid var(--border)",
          }}>
            <div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: r.k === "unmatched" ? "var(--bad-ink)" : "var(--ink)" }}>{r.k}</div>
              {r.note && (
                <div style={{ fontSize: 10.5, color: r.primary ? "var(--accent-ink)" : "var(--ink-3)", fontWeight: r.primary ? 600 : 500, letterSpacing: 0.3, marginTop: 2 }}>
                  {r.note}
                </div>
              )}
            </div>
            <div className="bar-track" style={{ margin: 0 }}>
              <div className="bar-track-fill" style={{ width: `${(r.v/total)*100}%`, background: r.color }} />
            </div>
            <div className="mono" style={{ fontSize: 13, color: "var(--ink-2)", textAlign: "right" }}>
              {r.v.toLocaleString()}
            </div>
            <div className="mono" style={{
              fontSize: 16,
              fontWeight: 600,
              color: r.primary ? "var(--bad-ink)" : (r.k === "unmatched" ? "var(--bad-ink)" : "var(--ink)"),
              textAlign: "right",
            }}>
              {r.pct}%
            </div>
          </div>
        ))}
      </div>

      {/* stacked bar */}
      <div className="stack-bar" style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", marginTop: 14, background: "var(--bg-sunken)" }}>
        <div title={`ds-legacy: ${legacyCnt.toLocaleString()}`} style={{ width: `${legacyRatio*100}%`, background: "var(--ink-3)" }} />
        <div title={`ds-new: ${newCnt.toLocaleString()}`} style={{ width: `${newRatio*100}%`, background: "var(--accent)" }} />
        <div title={`unmatched: ${unmatched.toLocaleString()}`} style={{ width: `${unmatchedRatio*100}%`, background: "var(--bad)" }} />
      </div>
      <div className="bar-track-legend" style={{ marginTop: 6 }}>
        <span className="mono dim">ds-legacy {legacyPct}%</span>
        <span className="mono dim" style={{ color: "var(--accent-ink)" }}>ds-new {newPct}%</span>
        <span className="mono dim" style={{ color: "var(--bad-ink)" }}>unmatched {unmatchedPct}%</span>
      </div>

      <FNote>
        ds-legacy 가 전체의 {legacyPct}% 로 의존도가 매우 높음. 장기적으로 primary (ds-new) 비중 증가 + 기타 DS 감소 기대 방향. (현재 측정은 도메인 파일 2개 / 프레임 3개 합산 — 도메인별 분리는 다음 측정 시 계획)
      </FNote>
    </FSection>
  );
}

// ---------- migration priority (v0.9 note 17) ----------
// figma.domainResults 활용 — frame flat 리스트 + primary (ds-new) 비중 오름차순.
// transformer (baseline-to-figma-data.ts) 가 frameRanking + domainSummary derive.
function MigrationPrioritySection({ d }) {
  const frames = d.frameRanking;
  const summary = d.domainSummary;
  if (!Array.isArray(frames) || frames.length === 0) return null;

  return (
    <FSection
      id="migration-priority"
      field="figma.domainResults"
      title="마이그레이션 작업 우선순위"
      status={{ kind: "note" }}
      direction={{ kind: "up-good", label: "primary 비중 높을수록" }}
    >
      <FNote>
        분모는 프레임 안 INSTANCE (DS 컴포넌트 사용) 만. 직접 그린 도형 / 텍스트는 미카운트.
        primary (ds-new) 비중 낮은 프레임 우선 작업.
      </FNote>

      <div className="prio-list">
        {frames.map((f, i) => {
          const ratio = f.primaryRatio;
          const newPct = ratio * 100;
          const legacyPct = f.total === 0 ? 0 : (f.counts.dsLegacy / f.total) * 100;
          const unmatchedPct = f.total === 0 ? 0 : (f.counts.unmatched / f.total) * 100;
          const badgeLabel =
            f.badge === "below-strong"
              ? "↓ 가장 우선"
              : f.badge === "below"
              ? "↓ 우선"
              : "기준 도달";
          const badgeKind = f.badge === "below-strong" ? "below" : f.badge;
          return (
            <div key={i} className={`prio-row${f.badge === "below-strong" ? " strong" : ""}`}>
              <div className="prio-rank mono">{String(i + 1).padStart(2, "0")}.</div>
              <div className="prio-body">
                <div className="prio-head">
                  <div className="prio-name mono">{f.label}</div>
                  <div className="prio-path">{f.domainPath}</div>
                  <span className="spacer" />
                  <div className="prio-ratio mono">{newPct.toFixed(1)}%</div>
                  <FStatusPill kind={badgeKind} label={badgeLabel} />
                </div>
                <div className="prio-bar">
                  <div className="prio-bar-fill new"  style={{ width: `${newPct}%` }} />
                  <div className="prio-bar-fill legacy"  style={{ width: `${legacyPct}%` }} />
                  <div className="prio-bar-fill unmatched" style={{ width: `${unmatchedPct}%` }} />
                </div>
                <div className="prio-counts mono">
                  ds-new {f.counts.dsNew.toLocaleString()} / ds-legacy {f.counts.dsLegacy.toLocaleString()} / unmatched {f.counts.unmatched.toLocaleString()} (총 {f.total.toLocaleString()})
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {Array.isArray(summary) && summary.length > 0 && (
        <div className="prio-domain-summary">
          <div className="prio-domain-title">도메인 합산 (참고)</div>
          {summary.map((s, i) => (
            <div key={i} className="prio-domain-row">
              <span className="prio-domain-name">{s.label}</span>
              <span className="mono prio-domain-meta">
                ds-new {(s.primaryRatio * 100).toFixed(1)}% ({s.counts.dsNew.toLocaleString()} / {s.total.toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      )}
    </FSection>
  );
}

// ---------- unmatched instances ----------
function UnmatchedSection({ d }) {
  const u = d.unmatchedInstances;
  const t = d.totalInstances;
  const ratio = u / t;
  return (
    <FSection
      id="unmatched"
      field="figma.instanceAnalysis.unmatchedInstances"
      title="DS 외부 Instance"
      status={{ kind: "below", label: "기준 미달 · 목표 0" }}
      direction={{ kind: "down-good" }}
    >
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono" style={{ color: "var(--bad-ink)" }}>{u}</div>
          <div className="kv-unit">건</div>
          <div className="kv-cap">DS 범위 밖에서 생성된 instance</div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">전체 instance</span>
            <span className="v mono">{t.toLocaleString()}</span>
          </div>
          <div className="kv-row">
            <span className="k">비중</span>
            <span className="v mono">{(ratio * 100).toFixed(1)}%</span>
          </div>
          <div className="kv-row">
            <span className="k">목표</span>
            <span className="v mono">0</span>
          </div>
        </div>
      </div>

      <p className="csect-desc">
        어떤 DS 카탈로그에도 등록되지 않은 instance. 디자이너가 임의로 만든 컴포넌트. <strong>1차 마이그레이션 대상</strong> — DS 안으로 먼저 가져와야 추적 가능.
      </p>

      <FNote>
        현재 baseline 에는 unmatched instance 의 파일 경로/이름 세부 데이터가 포함되어 있지 않음. 다음 측정 시 instanceAnalysis 의 항목별 raw 추가 수집 예정.
      </FNote>
    </FSection>
  );
}

// ---------- instance sources distribution (제거됨 — DsInstanceShareSection 으로 통합) ----------

// ---------- main FigmaTab ----------
function FigmaTab() {
  const d = window.__FIGMA_DATA;
  if (!d) return <div className="skeleton-note">데이터 로딩 중…</div>;
  return (
    <div className="figma-tab">
      {/* 헤더 — 카드 카운트 제외 (사용자 인지 상 "섹션" 분류 안 됨) */}
      <MeasurementScope d={d} />
      {FIGMA_CARD_SECTIONS.map((S, i) => <S key={i} d={d} />)}
    </div>
  );
}

// v0.10 (2026-04-29): 카드 컴포넌트 배열로 분리. window.FigmaTab_CardCount 자동 export.
// MeasurementScope 는 헤더라 카운트 제외 — 사용자 인지 상 "섹션" 5개 (현재 후속 4 작업 후).
const FIGMA_CARD_SECTIONS = [
  TokenMatchSection,
  TokenMatrixSection,
  DsInstanceShareSection,
  MigrationPrioritySection,
  UnmatchedSection,
];

window.FigmaTab_Detail = FigmaTab;
window.FigmaTab_CardCount = FIGMA_CARD_SECTIONS.length;
document.dispatchEvent(new Event("__figma-tab-ready"));
