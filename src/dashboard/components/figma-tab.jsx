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
  const primaryLabel = d.primaryLabel;
  const nonPrimaryLabels = d.nonPrimaryLabels ?? [];
  const primaryS = primaryLabel ? stats[primaryLabel] : null;
  if (!primaryS) return null;
  const primaryRatio = primaryS.matchedWithCode / primaryS.total;
  const primaryPct = (primaryRatio * 100).toFixed(1);

  return (
    <FSection
      id="token-match"
      field="figma.tokenMatrix.summary.dsStats"
      title="DS 토큰 매칭률 (Styles + Variables)"
      status={{ kind: "below", label: `기준 미달 · ${primaryS.matchedWithCode}/${primaryS.total}` }}
      direction={{ kind: "up-good" }}
    >
      {/* primary big number */}
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono" style={{ color: "var(--bad-ink)" }}>{primaryPct}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">
            <strong>{primaryLabel}</strong> · 기준 · {primaryS.matchedWithCode} / {primaryS.total}
          </div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">측정 범위</span>
            <span className="v">Styles만</span>
          </div>
          <div className="kv-row">
            <span className="k mono">{primaryLabel}</span>
            <span className="v mono">{primaryS.matchedWithCode} / {primaryS.total}</span>
          </div>
          {nonPrimaryLabels.map((label) => {
            const s = stats[label];
            if (!s) return null;
            return (
              <div key={label} className="kv-row">
                <span className="k mono">{label}</span>
                <span className="v mono">{s.matchedWithCode} / {s.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* per-DS rows */}
      <div className="csect-subhead">
        <h4>DS 별 매칭률</h4>
        <span className="csect-field mono">dsStats[label]</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {[primaryLabel, ...nonPrimaryLabels].map((label, i) => {
          const s = stats[label];
          if (!s) return null;
          const ratio = s.matchedWithCode / s.total;
          const pct = (ratio * 100).toFixed(1);
          const isPrimary = label === primaryLabel;
          return (
            <div key={label} className="ds-token-row" style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr 120px 90px",
              alignItems: "center",
              gap: 14,
              padding: "12px 14px",
              borderRadius: 6,
              background: "var(--bg-sunken)",
              border: "1px solid var(--border)",
              borderLeft: isPrimary ? "3px solid var(--bad)" : "1px solid var(--border)",
            }}>
              <div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500, marginTop: 2 }}>{isPrimary ? "기준" : "참고"}</div>
              </div>
              <div className="bar-track" style={{ margin: 0 }}>
                <div className="bar-track-fill" style={{ width: `${ratio * 100}%`, background: isPrimary ? "var(--bad)" : "var(--good)" }} />
              </div>
              <div className="mono" style={{ fontSize: 13, color: "var(--ink-2)", textAlign: "right" }}>
                {s.matchedWithCode} / {s.total}
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: isPrimary ? "var(--bad-ink)" : "var(--good-ink)", textAlign: "right" }}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>

      <FNote>
        현재 측정 범위: <strong>Styles만</strong>. Variables API 는 Enterprise plan 미보유로 조회 불가 — 다음 측정 시 plan 변경 시 자동 포함.
      </FNote>
    </FSection>
  );
}

// ---------- A2: 토큰 매트릭스 105행 ----------
function TokenMatrixSection({ d }) {
  const tm = d.tokenMatrix;
  if (!tm) return null;
  const { rows, duplicates, summary } = tm;
  // 0.2.0: ds-new/ds-legacy hardcoded 형태 → primary + non-primary 형태로 변경.
  // dn = primary 매칭 / dl = non-primary 매칭 합집합 (transformer enrichTokenMatrix 결과 사용).
  const dsLabels = [d.primaryLabel, ...(d.nonPrimaryLabels ?? [])].filter(Boolean);

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
            <span className="k">code만 (DS 미등록)</span>
            <span className="v mono">{summary.codeOnly}</span>
          </div>
          <div className="kv-row">
            <span className="k">DS만 (코드 미사용)</span>
            <span className="v mono">{summary.dsOnly}</span>
          </div>
        </div>
      </div>

      {/* mini stack bar */}
      <div className="stack-bar" style={{ display: "flex", height: 12, borderRadius: 4, overflow: "hidden", marginTop: 4, background: "var(--bg-sunken)" }}>
        <div title={`code+DS 양쪽: ${summary.both}`} style={{ width: `${(summary.both/rows.length)*100}%`, background: "var(--good)" }} />
        <div title={`code만: ${summary.codeOnly}`} style={{ width: `${(summary.codeOnly/rows.length)*100}%`, background: "var(--warn)" }} />
        <div title={`DS만: ${summary.dsOnly}`} style={{ width: `${(summary.dsOnly/rows.length)*100}%`, background: "var(--ink-4)" }} />
      </div>
      <div className="bar-track-legend" style={{ marginTop: 6 }}>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--good)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />양쪽 {summary.both}</span>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--warn)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />code만 {summary.codeOnly}</span>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--ink-4)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />DS만 {summary.dsOnly}</span>
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
  const primaryLabel = d.primaryLabel;
  const nonPrimaryLabels = d.nonPrimaryLabels ?? [];
  const primaryCnt = primaryLabel ? (d.instanceSources[primaryLabel] ?? 0) : 0;
  const nonPrimaryEntries = nonPrimaryLabels.map((label) => ({
    label,
    cnt: d.instanceSources[label] ?? 0,
  }));
  const nonPrimaryTotal = nonPrimaryEntries.reduce((s, e) => s + e.cnt, 0);
  const unmatched = d.unmatchedInstances;
  const total = primaryCnt + nonPrimaryTotal + unmatched;
  const primaryRatio = total === 0 ? 0 : primaryCnt / total;
  const unmatchedRatio = total === 0 ? 0 : unmatched / total;
  const primaryPct = (primaryRatio * 100).toFixed(1);
  const unmatchedPct = (unmatchedRatio * 100).toFixed(1);

  const rows = [
    { k: primaryLabel, v: primaryCnt, pct: primaryPct, color: "var(--accent)", primary: false, note: "기준" },
    ...nonPrimaryEntries.map((e) => ({
      k: e.label,
      v: e.cnt,
      pct: total === 0 ? "0.0" : ((e.cnt / total) * 100).toFixed(1),
      color: "var(--ink-3)",
      primary: false,
      note: "참고 · 장기 감소 기대",
    })),
    { k: "unmatched", v: unmatched, pct: unmatchedPct, color: "var(--bad)", primary: false, note: "DS 범위 밖" },
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
          <div className="kv-num mono" style={{ color: "var(--bad-ink)" }}>{primaryPct}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">
            <strong>{primaryLabel}</strong> · 기준 · {primaryCnt.toLocaleString()} / {total.toLocaleString()}
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
        {nonPrimaryEntries.map((e) => (
          <div key={e.label} title={`${e.label}: ${e.cnt.toLocaleString()}`}
            style={{ width: total === 0 ? '0%' : `${(e.cnt/total)*100}%`, background: "var(--ink-3)" }} />
        ))}
        <div title={`${primaryLabel}: ${primaryCnt.toLocaleString()}`} style={{ width: `${primaryRatio*100}%`, background: "var(--accent)" }} />
        <div title={`unmatched: ${unmatched.toLocaleString()}`} style={{ width: `${unmatchedRatio*100}%`, background: "var(--bad)" }} />
      </div>
      <div className="bar-track-legend" style={{ marginTop: 6 }}>
        {nonPrimaryEntries.map((e) => (
          <span key={e.label} className="mono dim">{e.label} {total === 0 ? '0.0' : ((e.cnt/total)*100).toFixed(1)}%</span>
        ))}
        <span className="mono dim" style={{ color: "var(--accent-ink)" }}>{primaryLabel} {primaryPct}%</span>
        <span className="mono dim" style={{ color: "var(--bad-ink)" }}>unmatched {unmatchedPct}%</span>
      </div>

      <FNote>
        primary ({primaryLabel}) {primaryPct}% / 참고 합계 {total === 0 ? '0.0' : ((nonPrimaryTotal/total)*100).toFixed(1)}% / unmatched {unmatchedPct}%. 장기적으로 primary 비중 증가 + 참고 비중 감소 기대.
      </FNote>
    </FSection>
  );
}

// ---------- migration priority (v0.9 note 17) ----------
// figma.domainResults 활용 — frame flat 리스트 + primary 비중 오름차순.
// transformer (baseline-to-figma-data.ts) 가 frameRanking + domainSummary derive.
function MigrationPrioritySection({ d }) {
  const frames = d.frameRanking;
  const summary = d.domainSummary;
  const primaryLabel = d.primaryLabel ?? "primary";
  const nonPrimaryLabel = (d.nonPrimaryLabels && d.nonPrimaryLabels[0]) || "참고";
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
        분모는 프레임 안 INSTANCE (DS 컴포넌트 사용)만. 직접 그린 도형 / 텍스트는 미카운트.
        primary ({primaryLabel}) 비중 낮은 프레임 우선 작업.
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
                  {primaryLabel} {f.counts.dsNew.toLocaleString()} / {nonPrimaryLabel} {f.counts.dsLegacy.toLocaleString()} / unmatched {f.counts.unmatched.toLocaleString()} (총 {f.total.toLocaleString()})
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
                {primaryLabel} {(s.primaryRatio * 100).toFixed(1)}% ({s.counts.dsNew.toLocaleString()} / {s.total.toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      )}
    </FSection>
  );
}

// ---------- component match (B 그룹 단계 3, 2026-04-29) ----------
// Figma DS variantGroup 이름 ↔ 코드 className (글로벌 인덱스 + jsx 사용) 매칭.
// 본 프로젝트 정책 (Figma 이름 = CSS class 동기화) 활용한 정확 일치 (B1).
function ComponentMatchSection({ d }) {
  const cm = d.componentMatch;
  if (!cm) return null;

  const { totals, summary } = cm;
  const totalPct = totals.figmaTotal === 0 ? 0 : (totals.matchRatio * 100);
  // 본 프로젝트 thresholds.componentMatch — good 0.7 / warn 0.4. 본 카드 자체 색 결정.
  const badgeKind =
    totals.matchRatio >= 0.7
      ? "met"
      : totals.matchRatio >= 0.4
      ? "note"
      : "below";
  const primaryInk =
    badgeKind === "below" ? "var(--bad-ink)"
    : badgeKind === "met" ? "var(--good-ink)"
    : "var(--ink)";

  // DS 별 row — primary 우선 정렬 (다른 카드와 시각 일관성).
  // analyzer 는 config 순서 보존 (Phase 0.6 호환). 표시 단에서 정렬.
  const primaryLabel = d.primaryLabel;
  const dsLabels = Object.keys(summary).sort((a, b) => {
    if (a === primaryLabel) return -1;
    if (b === primaryLabel) return 1;
    return 0;
  });

  return (
    <FSection
      id="component-match"
      field="figma.componentMatch"
      title="DS 컴포넌트 구현 매칭"
      status={{ kind: badgeKind, label:
        badgeKind === "met" ? "기준 도달"
        : badgeKind === "note" ? "참고"
        : "기준 미달"
      }}
      direction={{ kind: "up-good" }}
    >
      {/* primary big number */}
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono" style={{ color: primaryInk }}>{totalPct.toFixed(1)}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">
            <strong>합계 매칭률</strong> · {totals.matched} / {totals.figmaTotal}
          </div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">측정 범위</span>
            <span className="v">variantGroup + standalone</span>
          </div>
          <div className="kv-row">
            <span className="k">Figma만 (코드 미사용)</span>
            <span className="v mono">{totals.figmaOnly}</span>
          </div>
          <div className="kv-row">
            <span className="k">코드만 (DS 정의 없음)</span>
            <span className="v mono">{totals.codeOnly}</span>
          </div>
          <div className="kv-row">
            <span className="k">목표</span>
            <span className="v mono">≥ 70%</span>
          </div>
        </div>
      </div>

      {/* per-DS rows — matched 3종 stack 막대 (보정 1+4, 2026-04-29 후속):
          both (녹색) / jsxOnly (주황) / cssOnly (회색). figmaOnly = 빈 부분 (.bar-track
          배경 --border-strong 자동 노출 — 보정 6). DsInstanceShareSection 막대 패턴과 핵심 동일. */}
      <div className="csect-subhead">
        <h4>DS 별 매칭률</h4>
        <span className="csect-field mono">summary[label]</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {dsLabels.map((label, i) => {
          const s = summary[label];
          const ratio = s.matchRatio;
          const pct = (ratio * 100).toFixed(1);
          const isPrimary = label === primaryLabel;
          const numInk =
            ratio >= 0.7 ? "var(--good-ink)"
            : ratio >= 0.4 ? "var(--warn-ink)"
            : "var(--bad-ink)";
          // primary border 색은 매칭률 기반 (카드 left border만).
          const borderColor =
            ratio >= 0.7 ? "var(--good)"
            : ratio >= 0.4 ? "var(--warn)"
            : "var(--bad)";

          const total = s.figmaTotal;
          const bothW = total === 0 ? 0 : (s.matchedBreakdown.both / total) * 100;
          const jsxOnlyW = total === 0 ? 0 : (s.matchedBreakdown.jsxOnly / total) * 100;
          const cssOnlyW = total === 0 ? 0 : (s.matchedBreakdown.globalCssOnly / total) * 100;

          return (
            <div key={label} className="ds-token-row" style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr 130px 90px",
              alignItems: "center",
              gap: 14,
              padding: "12px 14px",
              borderRadius: 6,
              background: "var(--bg-sunken)",
              border: "1px solid var(--border)",
              borderLeft: isPrimary ? `3px solid ${borderColor}` : "1px solid var(--border)",
            }}>
              <div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500, marginTop: 2 }}>
                  {isPrimary ? "기준" : "참고"}
                </div>
              </div>
              {/* matched 3종 stack 막대. 빈 부분 = .bar-track 배경 (--border-strong) 자동 노출. */}
              <div className="bar-track" style={{ margin: 0, display: "flex", overflow: "hidden" }}>
                <div title={`both: ${s.matchedBreakdown.both}`}
                  style={{ width: `${bothW}%`, background: "var(--good)", height: "100%" }} />
                <div title={`jsx만 (orphan 가능성): ${s.matchedBreakdown.jsxOnly}`}
                  style={{ width: `${jsxOnlyW}%`, background: "var(--warn)", height: "100%" }} />
                <div title={`css만 (dead 가능성): ${s.matchedBreakdown.globalCssOnly}`}
                  style={{ width: `${cssOnlyW}%`, background: "var(--ink-3)", height: "100%" }} />
              </div>
              <div className="mono" style={{ fontSize: 13, color: "var(--ink-2)", textAlign: "right" }}>
                {s.matched} / {s.figmaTotal}
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: numInk, textAlign: "right" }}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>

      {/* legend — matched 3종 (figmaOnly 는 빈 막대 자동 시각). */}
      <div className="bar-track-legend" style={{ marginTop: 8 }}>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--good)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />both (정상)</span>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--warn)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />jsx만 (orphan 가능성)</span>
        <span className="mono dim"><span style={{display:"inline-block",width:8,height:8,background:"var(--ink-3)",borderRadius:2,marginRight:5,verticalAlign:"middle"}} />css만 (dead 가능성)</span>
      </div>

      {/* 분류 4종 한 줄 안내 (3차 시각 검증 후 보정 1, 2026-04-29 후속).
          카드 본문 시각 부담 감소 — 자세 의미는 Disclosure 안 첫 줄 안내로 위계 분리. */}
      <FNote>
        <strong>both</strong> (정상 사용) / <strong>jsx만</strong> (orphan 가능성) /
        {" "}<strong>css만</strong> (dead 가능성) / <strong>Figma만</strong> (작업 우선순위)
      </FNote>

      {/* DS 별 matchedBreakdown 표 — 보정 2 (2026-04-29 후속): figmaOnly + 합계 컬럼 추가. */}
      <div style={{ marginTop: 8 }}>
        <table className="ftable" style={{ width: "100%", fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>DS</th>
              <th style={{ textAlign: "right" }}>both</th>
              <th style={{ textAlign: "right" }}>jsx만</th>
              <th style={{ textAlign: "right" }}>css만</th>
              <th style={{ textAlign: "right" }}>Figma만</th>
              <th style={{ textAlign: "right" }}>합계</th>
            </tr>
          </thead>
          <tbody>
            {dsLabels.map(label => {
              const s = summary[label];
              const b = s.matchedBreakdown;
              return (
                <tr key={label}>
                  <td className="mono">{label}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{b.both}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{b.jsxOnly}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{b.globalCssOnly}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{s.figmaOnly}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{s.figmaTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Disclosure detail — matched / figmaOnly / codeOnly */}
      {cm.matched.length > 0 && (
        <FDisclosure summary={`매칭된 컴포넌트 (${cm.matched.length}개)`} count={cm.matched.length}>
          <table className="ftable" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>이름</th>
                <th style={{ textAlign: "left" }}>출처</th>
                <th style={{ textAlign: "left" }}>종류</th>
                <th style={{ textAlign: "left" }}>매칭 출처</th>
              </tr>
            </thead>
            <tbody>
              {cm.matched.map((e, i) => (
                <tr key={i}>
                  <td className="mono">{e.name}</td>
                  <td className="mono dim">{e.figmaSource}</td>
                  <td className="mono dim">{e.kind}</td>
                  <td className="mono dim">{e.matchedIn.join(" + ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FDisclosure>
      )}

      {cm.figmaOnly.length > 0 && (
        <FDisclosure
          summary={`Figma만 — 코드 미구현 (${cm.figmaOnly.length}개, 작업 우선순위)`}
          count={cm.figmaOnly.length}
        >
          <FNote>
            Figma 컴포넌트 정의 있는데 코드에서 className 으로 안 씀. 작업 우선순위.
          </FNote>
          <table className="ftable" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>이름</th>
                <th style={{ textAlign: "left" }}>출처</th>
                <th style={{ textAlign: "left" }}>종류</th>
              </tr>
            </thead>
            <tbody>
              {cm.figmaOnly.map((e, i) => (
                <tr key={i}>
                  <td className="mono">{e.name}</td>
                  <td className="mono dim">{e.figmaSource}</td>
                  <td className="mono dim">{e.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FDisclosure>
      )}

      {cm.codeOnly.length > 0 && (
        <FDisclosure
          summary={`코드만 — DS 정의 없음 (${cm.codeOnly.length}개, DS 외부)`}
          count={cm.codeOnly.length}
        >
          <FNote>
            코드에서 className 으로 쓰고 css 에 정의됐는데 Figma 컴포넌트 정의 없음. DS 외부에서
            정상 동작 중인 className. 상위 100개 표시.
          </FNote>
          <table className="ftable" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>이름</th>
              </tr>
            </thead>
            <tbody>
              {cm.codeOnly.slice(0, 100).map((e, i) => (
                <tr key={i}>
                  <td className="mono">{e.name}</td>
                </tr>
              ))}
              {cm.codeOnly.length > 100 && (
                <tr>
                  <td className="dim" style={{ fontStyle: "italic", fontSize: 11 }}>
                    이하 {cm.codeOnly.length - 100}개 생략 (baseline JSON 의 figma.componentMatch.codeOnly 참조)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </FDisclosure>
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
// v0.11 (2026-04-29): ComponentMatchSection 추가 (B 그룹 단계 3) — 5 → 6 카드.
// MeasurementScope 는 헤더라 카운트 제외 — 사용자 인지 상 "섹션" 6개.
// 정보 위계: 거시 (이름 / 빈도 / 매칭) → 미시 (프레임별 / 컴포넌트 매칭) → 외부 (unmatched).
const FIGMA_CARD_SECTIONS = [
  TokenMatchSection,
  TokenMatrixSection,
  DsInstanceShareSection,
  MigrationPrioritySection,
  ComponentMatchSection,
  UnmatchedSection,
];

window.FigmaTab_Detail = FigmaTab;
window.FigmaTab_CardCount = FIGMA_CARD_SECTIONS.length;
document.dispatchEvent(new Event("__figma-tab-ready"));
