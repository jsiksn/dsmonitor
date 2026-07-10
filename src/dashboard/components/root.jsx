/* global React */
// DSMonitor Dashboard — root JSX. 시안 (Claude Design 핸드오프) 의 root mount 코드 그대로
// + const DATA hardcoded → window.__SUMMARY_DATA 로 변경 (자동 변환).
//
// 원본 시안: dsmonitor/project/Phase 0.5 Review Dashboard.html L532-862
// 변경: const DATA = { ... }; 하드코딩 블록 제거, const DATA = window.__SUMMARY_DATA 로 대체.

const { useState } = React;

const DATA = window.__SUMMARY_DATA;
const PROJECT_NAME = window.__PROJECT_NAME ?? "Unknown Project";


  const pct = (x, d = 1) => (x * 100).toFixed(d);

  // 0.8.8 — thresholds 판정 기반 표기 helpers.
  //   status ("good"/"warn"/"bad") 는 transformer 가 markdown 리포터와 공유하는
  //   evaluate() 로 계산해 내려줌 (code.judge.*). jsx 는 렌더만 — 판정 로직을
  //   jsx 에 두지 않음 (옛 시안 리터럴 배지의 화석화 재발 방지).
  //   judge null (config 에 threshold 없음) = 상태 태그 숨김 + 중립색.
  const STATUS_TAG = {
    good: { cls: "met",   text: "기준 도달" },
    warn: { cls: "note",  text: "참고" },
    bad:  { cls: "below", text: "기준 미달" },
  };
  const statusNumCls = (s) => (s === "good" ? "good" : s === "warn" ? "warn" : s === "bad" ? "bad" : "");
  const fmtRatioGoal = (j) =>
    j ? `목표 ${j.direction === "higher" ? "≥" : "≤"} ${(j.good * 100).toFixed(0)}%` : "";
  const fmtCountGoal = (j) =>
    j ? `목표 ${j.direction === "higher" ? "≥" : "≤"} ${j.good.toLocaleString()} 건` : "";
  // Lighthouse 표준 임계 — lighthouse-tab.jsx lhBadgeFromScore 와 동일 (≥90 / ≥75).
  const lhStatus = (s01) => {
    const n = s01 * 100;
    return n >= 90 ? "good" : n >= 75 ? "warn" : "bad";
  };

  function Header() {
    // v0.15 (2026-04-30): hdr-meta 부분 (Code / Figma / Lighthouse 3행 stamp) 삭제.
    // 측정 시점은 각 Layer 의 layer-head stamp + plugin 탭 헤더 2곳에서만 표시.
    return (
      <header className="hdr">
        <div>
          <div className="hdr-title">
            <div className="hdr-logo">UI</div>
            <div>
              <h1>DSMonitor 리뷰</h1>
              <div className="sub">{PROJECT_NAME} · UI 건강 상태 스냅샷</div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  function Tabs({ tab, setTab }) {
    // v0.10 (2026-04-29): 카운트 자동 derive. 각 탭 jsx 가 window.{Tab}_CardCount export.
    // Lighthouse 는 카드 카운트 아닌 URL 카운트 (window.__LH_DATA.totalUrls).
    // v0.12 (2026-04-29, Phase 0.6): 누락된 부분 탭 헤더 hide — figma / Lighthouse optional 핵심.
    // v0.15 (2026-04-30): 사이드카 plugin 탭 동적 추가 (id 알파벳 순) + 검증 실패 / stale 배지.
    const codeCardCount = window.CodeTab_CardCount;
    const figmaCardCount = window.FigmaTab_CardCount;
    const lhUrlCount = window.__LH_DATA?.totalUrls;
    const pluginEntries = window.__PLUGINS_DATA ?? [];
    const pluginTabs = pluginEntries.map((p) => {
      const id = p.ok ? p.output.id : p.id;
      const label = p.ok ? p.output.label : p.id;
      return {
        id: `plugin:${id}`,
        label,
        error: !p.ok,
        stale: p.ok && p.stale,
      };
    });
    const tabs = [
      { id: "summary", label: "Summary" },
      { id: "code",       label: "Code",       count: codeCardCount  != null ? `${codeCardCount} 섹션` : null },
      ...(window.__LH_DATA    ? [{ id: "lighthouse", label: "Lighthouse", count: lhUrlCount     != null ? `${lhUrlCount} URL`     : null }] : []),
      ...(window.__FIGMA_DATA ? [{ id: "figma",      label: "Figma",      count: figmaCardCount != null ? `${figmaCardCount} 섹션` : null }] : []),
      ...pluginTabs,
    ];
    // 0.8.10 — 접근성: tab ↔ tabpanel 연결 (id / aria-controls) + 좌우 화살표 이동.
    //   roving tabindex — 활성 탭만 Tab 키 focus 대상, 탭 간 이동은 화살표 키.
    const onKeyDown = (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const idx = tabs.findIndex(t => t.id === tab);
      const next = e.key === "ArrowRight"
        ? (idx + 1) % tabs.length
        : (idx - 1 + tabs.length) % tabs.length;
      setTab(tabs[next].id);
      document.getElementById(`tab-${tabs[next].id}`)?.focus();
    };
    return (
      <nav className="tabs" role="tablist" aria-label="측정 결과 탭">
        {tabs.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="tabpanel"
            tabIndex={tab === t.id ? 0 : -1}
            className="tab"
            onClick={() => setTab(t.id)}
            onKeyDown={onKeyDown}
          >
            {t.label}
            {t.count && <span className="count">{t.count}</span>}
            {t.error && <span className="tag below" style={{marginLeft:6, fontSize:9, padding:"1px 4px"}}><span className="tdot" />오류</span>}
            {t.stale && !t.error && <span className="tag stale" style={{marginLeft:6, fontSize:9, padding:"1px 4px"}}><span className="tdot" />stale</span>}
          </button>
        ))}
      </nav>
    );
  }

  function TrendReserved({ note }) {
    return (
      <div className="trend" title="N=1 스냅샷 — 시계열 비교는 2회차 측정부터 표시">
        <div className="trend-empty">
          <span className="trend-label">추세</span>
          <span className="trend-dots" aria-hidden>
            <span className="d" style={{height:8}} />
            <span className="d" style={{height:10}} />
            <span className="d" style={{height:7}} />
            <span className="d" style={{height:12}} />
            <span className="d" style={{height:9}} />
            <span className="d cur" style={{height:14}} />
          </span>
        </div>
        <span className="trend-note">{note || "N=1 · 다음 측정 대기"}</span>
      </div>
    );
  }

  // 0.8.8 — belowThreshold 리터럴 prop → status ("good"/"warn"/"bad"/undefined) 로 교체.
  //   undefined = threshold 미설정 지표 — 상태 태그 자체를 표시하지 않음.
  function Card({ label, status, tags, children, wide }) {
    const tag = STATUS_TAG[status];
    return (
      <section className={`card${wide ? " wide" : ""}${status === "bad" ? " below-threshold" : ""}`}>
        <div className="card-head">
          <div className="card-label">{label}</div>
          <div className="card-tags">
            {tag && <span className={`tag ${tag.cls}`}><span className="tdot" />{tag.text}</span>}
            {tags}
          </div>
        </div>
        {children}
      </section>
    );
  }

  const ArrowUp = () => <svg className="arrow" viewBox="0 0 16 16" fill="none"><path d="M8 14V2M8 2L3 7M8 2L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const ArrowDown = () => <svg className="arrow" viewBox="0 0 16 16" fill="none"><path d="M8 2V14M8 14L3 9M8 14L13 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

  function Summary() {
    const d = DATA;
    return (
      <div>
        <div className="layer">
          <div className="layer-head">
            <div className="layer-title">
              <div className="layer-tag">Layer 01 / Code</div>
              <h2>소스코드 정적 분석</h2>
              <div className="desc">스타일 · TS · DS 사용 규칙이 코드에 어느 정도 반영되어 있나</div>
            </div>
            <div className="stamp">측정 <span className="mono">{d.stamp.code}</span></div>
          </div>
          <div className="grid">
            {(() => {
              // 0.8.8 — 배지 / 목표 / 색상을 cfg.thresholds 판정 (judge) 으로 동적화.
              //   옛 리터럴 (belowThreshold 고정, "목표 ≥ 80%" 등 시안 잔재) 대체.
              const jDs = d.code.judge?.dsCoverage ?? null;
              const jFb = d.code.judge?.forbidden ?? null;
              const jTs = d.code.judge?.tsMigration ?? null;
              const topJsDirs = d.code.tsTopJsDirs ?? [];
              return (
                <React.Fragment>
                  <Card label="DS 커버리지" status={jDs?.status}>
                    <div className="numwrap"><span className={`num ${statusNumCls(jDs?.status)}`}>{pct(d.code.dsCoverage, 1)}</span><span className="unit">%</span></div>
                    <div className="bar"><div className={`bar-fill ${statusNumCls(jDs?.status) || "accent"}`} style={{width: `${pct(d.code.dsCoverage)}%`}} /></div>
                    <div className="bar-row"><span className="mono">DS 사용 {d.code.dsFilesUsing} / 전체 소비자 {d.code.dsTotalConsumer}</span><span>{fmtRatioGoal(jDs) || "높을수록 좋음"}</span></div>
                    <div className="card-desc">DS 컴포넌트를 import 하는 파일 비율. 높을수록 좋음.</div>
                    <TrendReserved note={jDs?.status === "good" ? undefined : "↑ 상승 필요"} />
                  </Card>

                  <Card label="금지 CSS 클래스 (활용 횟수)" status={jFb?.status}>
                    <div className="numwrap"><span className={`num ${statusNumCls(jFb?.status)}`}>{d.code.forbiddenTotal.toLocaleString()}</span><span className="unit">건</span></div>
                    {(d.code.forbiddenByPreset ?? []).map((row) => (
                      <div key={row.id} className="emph-row">
                        <span className="k">{row.label}</span>
                        <span className="v">{row.value}</span>
                      </div>
                    ))}
                    <div className="card-hint"><ArrowDown /><span><strong>{fmtCountGoal(jFb) || "낮을수록 좋음"}</strong> — 파일별 Top 20 은 Code 탭에서 확인.</span></div>
                    <TrendReserved note={jFb?.status === "good" ? undefined : "↓ 감소 필요"} />
                  </Card>

                  <Card label="TypeScript 마이그레이션" status={jTs?.status}>
                    <div className="numwrap"><span className={`num ${statusNumCls(jTs?.status)}`}>{pct(d.code.tsRatio, 1)}</span><span className="unit">%</span></div>
                    <div className="bar"><div className={`bar-fill ${statusNumCls(jTs?.status) || "accent"}`} style={{width: `${pct(d.code.tsRatio)}%`}} /></div>
                    <div className="bar-row"><span className="mono">{d.code.tsFiles} ts / {d.code.tsFiles + d.code.jsFiles} 전체</span><span>{fmtRatioGoal(jTs) || "높을수록 좋음"}</span></div>
                    <div className="card-hint"><ArrowUp /><span>디렉토리별 분포는 Code 탭에서 확인{topJsDirs.length > 0 ? <> — JS 잔여 상위: <span className="mono">{topJsDirs.join(" · ")}</span></> : null}.</span></div>
                    <TrendReserved note={jTs?.status === "good" ? undefined : "↑ 상승 필요"} />
                  </Card>
                </React.Fragment>
              );
            })()}
          </div>
        </div>

        {d.lh && <div className="layer">
          <div className="layer-head">
            <div className="layer-title">
              <div className="layer-tag">Layer 02 / Lighthouse</div>
              <h2>런타임 품질</h2>
              {/* 0.8.8 — 옛 시안 잔재 리터럴 (고정 페이지 수 문구) → 측정된 URL / run 수. */}
              <div className="desc">{d.lh.urls}개 페이지 · 각 {d.lh.runs}회 측정 median</div>
            </div>
            <div className="stamp">측정 <span className="mono">{d.stamp.lighthouse}</span></div>
          </div>
          <div className="grid">
            {(() => {
              // v0.10 (2026-04-29) 작업 1: Summary Lighthouse 4 카드 표기 통일.
              // urlTable 에서 metric 별 min/max 자동 derive. min === max 면 단일 값만.
              const fmtRange = (xs) => {
                const mn = Math.min(...xs), mx = Math.max(...xs);
                return mn === mx
                  ? `${(mn * 100).toFixed(1)}`
                  : `${(mn * 100).toFixed(1)} – ${(mx * 100).toFixed(1)}`;
              };
              const measure = `${d.lh.urls} URL · ${d.lh.runs}-run median`;
              const perfRange = fmtRange(d.lh.urlTable.map(r => r[1]));
              const a11yRange = fmtRange(d.lh.urlTable.map(r => r[2]));
              const bpRange   = fmtRange(d.lh.urlTable.map(r => r[3]));
              const seoRange  = fmtRange(d.lh.urlTable.map(r => r[4]));
              // 0.8.8 — 배지 / 문구를 Lighthouse 표준 임계 (≥90 / ≥75) 판정으로 동적화.
              //   옛 시안 잔재 (배지 리터럴 + 점수와 무관한 소견 문구) 대체.
              //   Lighthouse 탭 상세 (lhBadgeFromScore) 와 같은 임계 — 탭 간 배지 일치.
              const perfS = lhStatus(d.lh.avgPerf);
              const a11yS = lhStatus(d.lh.avgA11y);
              const bpS   = lhStatus(d.lh.avgBP);
              const seoS  = lhStatus(d.lh.avgSeo);
              const bpSeoWorse = [bpS, seoS].includes("bad") ? "bad" : [bpS, seoS].includes("warn") ? "warn" : "good";
              const perfMin = Math.min(...d.lh.urlTable.map(r => r[1]));
              const goalNote = (s) => (s === "good" ? "기준 90 이상" : "기준 90 미만");
              return (
                <React.Fragment>
                  <Card label="Performance 평균" status={perfS}>
                    <div className="numwrap"><span className={`num ${statusNumCls(perfS)}`}>{(d.lh.avgPerf * 100).toFixed(1)}</span><span className="unit">/ 100</span></div>
                    <div className="bar"><div className={`bar-fill ${statusNumCls(perfS)}`} style={{width: `${d.lh.avgPerf * 100}%`}} /></div>
                    <div className="bar-row"><span>{measure} · 범위 {perfRange}</span><span>목표 ≥ 90</span></div>
                    <div className="card-desc">{goalNote(perfS)} · 최저 {(perfMin * 100).toFixed(1)}.</div>
                    <TrendReserved note={perfS === "good" ? undefined : "↑ 상승 필요"} />
                  </Card>

                  <Card label="Accessibility 평균" status={a11yS}>
                    <div className="numwrap"><span className={`num ${statusNumCls(a11yS)}`}>{(d.lh.avgA11y * 100).toFixed(1)}</span><span className="unit">/ 100</span></div>
                    <div className="bar"><div className={`bar-fill ${statusNumCls(a11yS)}`} style={{width: `${d.lh.avgA11y * 100}%`}} /></div>
                    <div className="bar-row"><span>{measure} · 범위 {a11yRange}</span><span>목표 ≥ 90</span></div>
                    <div className="emph-row" style={{marginTop:8}}>
                      <span className="k">최저 · {d.lh.worst.url}</span>
                      <span className="v" style={{color:"var(--bad-ink)"}}>{(d.lh.worst.a11y * 100).toFixed(1)}</span>
                    </div>
                    <div className="card-hint"><ArrowUp /><span>{goalNote(a11yS)} — URL별 상세는 Lighthouse 탭에서 확인.</span></div>
                    <TrendReserved note={a11yS === "good" ? undefined : "↑ 상승 필요"} />
                  </Card>

                  <Card label="Best Practices · SEO" status={bpSeoWorse}>
                    <div style={{display:"flex", gap:24, alignItems:"flex-start", marginTop:4}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11, color:"var(--ink-3)", fontWeight:500, marginBottom:4}}>Best Practices</div>
                        <div className="numwrap" style={{margin:0}}>
                          <span className={`num ${statusNumCls(bpS)}`} style={{fontSize:32}}>{(d.lh.avgBP*100).toFixed(1)}</span>
                          <span className="unit" style={{fontSize:13}}>/ 100</span>
                        </div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:6}}>{measure}</div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>범위 {bpRange}</div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11, color:"var(--ink-3)", fontWeight:500, marginBottom:4}}>SEO</div>
                        <div className="numwrap" style={{margin:0}}>
                          <span className={`num ${statusNumCls(seoS)}`} style={{fontSize:32}}>{(d.lh.avgSeo*100).toFixed(1)}</span>
                          <span className="unit" style={{fontSize:13}}>/ 100</span>
                        </div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:6}}>{measure}</div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>범위 {seoRange}</div>
                      </div>
                    </div>
                    <div className="card-desc" style={{marginTop:16}}>
                      {bpSeoWorse === "good"
                        ? "두 지표 모두 기준 90 이상."
                        : `기준 90 미만: ${[bpS !== "good" && "Best Practices", seoS !== "good" && "SEO"].filter(Boolean).join(" · ")}.`}
                    </div>
                    <TrendReserved note={bpSeoWorse === "good" ? undefined : "↑ 상승 필요"} />
                  </Card>
                </React.Fragment>
              );
            })()}
          </div>
        </div>}

        {d.figma && <div className="layer">
          <div className="layer-head">
            <div className="layer-title">
              <div className="layer-tag">Layer 03 / Figma</div>
              <h2>디자인 시스템 일치성</h2>
              <div className="desc">토큰 · 컴포넌트 instance 가 코드에 얼마나 반영되어 있나</div>
            </div>
            <div className="stamp">측정 <span className="mono">{d.stamp.figma}</span></div>
          </div>
          <div className="grid">
            {/* 0.8.8 — figma 카드는 config thresholds 에 대응 지표가 없어 옛 belowThreshold
                리터럴 배지를 제거 (근거 없는 판정 표시 X). 방향 표기 ("목표 ↑") 는 유지. */}
            <Card label={`${d.figma.primaryLabel ?? "primary"} 토큰 매칭률 (${d.figma.variablesCount != null ? "Styles + Variables" : "Styles"})`}>
              {(() => {
                // 0.8.0 — 분모 0 케이스 (DS 안 styles=0) NaN 표시 정정.
                const ratio = d.figma.dsNewTotal === 0 ? 0 : d.figma.dsNewMatched / d.figma.dsNewTotal;
                return (
                  <>
              <div className="numwrap">
                <span className="num">{pct(ratio, 1)}</span>
                <span className="unit">%</span>
                <span className="sub-num">· {d.figma.dsNewMatched} / {d.figma.dsNewTotal}</span>
              </div>
              <div className="bar"><div className="bar-fill accent" style={{width: `${ratio * 100}%`}} /></div>
                  </>
                );
              })()}
              <div className="bar-row"><span>primary DS 토큰이 코드에 반영된 비율</span><span>목표 ↑</span></div>
              {/* 0.8.8 — Variables 안내를 스캔 신호 기반 조건부 표시 (옛 "plan 제약" 리터럴 대체). */}
              {d.figma.variablesRestricted && (
                <div className="card-desc">Variables 는 Enterprise plan 제약으로 미조회 — Styles 만 집계.</div>
              )}
              {d.figma.variablesCount != null && (
                <div className="card-desc">Variables {d.figma.variablesCount.toLocaleString()}건 포함 집계.</div>
              )}
              <TrendReserved note="↑ 상승 필요" />
            </Card>

            <Card label="DS 피그마 Instance 비중">
              {(() => {
                const primaryLabel = d.figma.primaryLabel;
                const nonPrimaryLabels = d.figma.nonPrimaryLabels ?? [];
                const inPrimary = primaryLabel ? (d.figma.instanceSources[primaryLabel] ?? 0) : 0;
                const inNonPrimary = nonPrimaryLabels.reduce((s, l) => s + (d.figma.instanceSources[l] ?? 0), 0);
                const totalInst = inPrimary + inNonPrimary + d.figma.unmatchedInstances;
                const ratio = totalInst === 0 ? 0 : inPrimary / totalInst;
                return (
                  <React.Fragment>
                    <div className="numwrap"><span className="num">{(ratio*100).toFixed(1)}</span><span className="unit">%</span></div>
                    <div className="bar"><div className="bar-fill accent" style={{width: `${ratio*100}%`}} /></div>
                    <div className="bar-row"><span className="mono">{primaryLabel} {inPrimary.toLocaleString()} / 전체 {totalInst.toLocaleString()}</span><span>목표 ↑</span></div>
                    <div className="card-desc">
                      전체 instance 중 primary DS ({primaryLabel}) 사용 비율.
                      {nonPrimaryLabels.length > 0 && totalInst > 0 && (
                        <> 참고 합계 {((inNonPrimary/totalInst)*100).toFixed(1)}%,</>
                      )}
                      {totalInst > 0 && <> unmatched {((d.figma.unmatchedInstances/totalInst)*100).toFixed(1)}%</>}
                      {" 는 Figma 탭 통합 카드에서 분포 확인."}
                    </div>
                  </React.Fragment>
                );
              })()}
              <TrendReserved note="↑ 상승 필요" />
            </Card>

            {/* 건수 기반 동적 판정 — "DS 범위 밖" 정의 상 목표 0 고유 (figma 탭
                UnmatchedSection 과 같은 규칙 — 탭 간 판정 일치). */}
            <Card label="DS 외부 Instance" status={d.figma.unmatchedInstances > 0 ? "bad" : "good"}>
              <div className="numwrap"><span className={`num ${d.figma.unmatchedInstances > 0 ? "bad" : "good"}`}>{d.figma.unmatchedInstances}</span><span className="unit">건</span></div>
              <div className="emph-row"><span className="k">전체 instance</span><span className="v">{d.figma.totalInstances.toLocaleString()}</span></div>
              {(d.figma.nonPrimaryLabels ?? []).map((label) => (
                <div key={label} className="emph-row"><span className="k mono">{label} 사용</span><span className="v">{(d.figma.instanceSources[label] ?? 0).toLocaleString()}</span></div>
              ))}
              {d.figma.primaryLabel && (
                <div className="emph-row"><span className="k mono">{d.figma.primaryLabel} 사용</span><span className="v">{(d.figma.instanceSources[d.figma.primaryLabel] ?? 0).toLocaleString()}</span></div>
              )}
              <div className="card-hint"><ArrowDown /><span>어떤 DS 에도 속하지 않은 instance · <strong>감소 필요</strong>.</span></div>
              <TrendReserved note="↓ 감소 필요" />
            </Card>
          </div>
        </div>}

        {/* v0.15: 사이드카 plugin Layer — plugin 1개당 Layer 1개 자동 추가.
            Layer 번호 = activeLayerCount + idx + 1 (figma 누락 환경 등 동적). */}
        {(() => {
          const plugins = window.__PLUGINS_DATA ?? [];
          if (plugins.length === 0) return null;
          // codebase 항상 활성 + lighthouse / figma 가드 흐름 일치.
          const activeLayerCount = 1 + (d.lh ? 1 : 0) + (d.figma ? 1 : 0);
          return plugins.map((p, idx) => {
            const layerNum = String(activeLayerCount + 1 + idx).padStart(2, "0");
            if (!p.ok) {
              // 정정 1 (B-2 안): grid 카드 부분 삭제 — layer-head 만 표시. 사유 본문은 plugin 탭 (PluginErrorView) 안에서만.
              return (
                <div key={`plugin-${p.id}-err`} className="layer">
                  <div className="layer-head">
                    <div className="layer-title">
                      <div className="layer-tag">Layer {layerNum} / {p.id}</div>
                      <h2>{p.id}</h2>
                      <div className="desc">plugin 정보 검증 실패 — 탭 클릭해서 사유 확인</div>
                    </div>
                    <div className="stamp"><span className="tag below"><span className="tdot" />검증 실패</span></div>
                  </div>
                </div>
              );
            }
            const out = p.output;
            const stamp = (out.measuredAt || "").slice(0, 10);
            const cls = (s) => s === "good" ? "good" : s === "warn" ? "warn" : s === "bad" ? "bad" : "";
            return (
              <div key={`plugin-${out.id}`} className="layer">
                <div className="layer-head">
                  <div className="layer-title">
                    <div className="layer-tag">Layer {layerNum} / {out.label}</div>
                    <h2>{out.label}</h2>
                    {out.summary.primary.hint && <div className="desc">{out.summary.primary.hint}</div>}
                  </div>
                  <div className="stamp">
                    {p.stale && <span className="tag stale" style={{marginRight:8}}><span className="tdot" />7일+ stale</span>}
                    측정 <span className="mono">{stamp}</span>
                  </div>
                </div>
                <div className="grid">
                  {/* 0.8.8 — Card belowThreshold prop → status. plugin 카드는 옛 동작 보존
                      (bad 시점에만 "기준 미달" 태그 — plugin status 어휘가 자체 정의라 그대로). */}
                  <Card label={out.summary.primary.label} status={out.summary.primary.status === "bad" ? "bad" : undefined}>
                    <div className="numwrap">
                      <span className={`num ${cls(out.summary.primary.status)}`}>{out.summary.primary.value}</span>
                    </div>
                    {out.summary.primary.hint && <div className="card-desc">{out.summary.primary.hint}</div>}
                  </Card>
                  {(out.summary.secondary ?? []).map((c, i) => (
                    <Card key={i} label={c.label} status={c.status === "bad" ? "bad" : undefined}>
                      <div className="numwrap">
                        <span className={`num ${cls(c.status)}`}>{c.value}</span>
                      </div>
                      {c.hint && <div className="card-desc">{c.hint}</div>}
                    </Card>
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </div>
    );
  }

  function CodeTab() {
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => {
      const handler = () => force();
      document.addEventListener("__code-tab-ready", handler);
      return () => document.removeEventListener("__code-tab-ready", handler);
    }, []);
    const Comp = window.CodeTab_Detail;
    if (!Comp) return <div className="skeleton-note"><span className="tdot" />Code 탭 모듈 로딩 중…</div>;
    return <Comp />;
  }

  function LighthouseTab() {
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => {
      const handler = () => force();
      document.addEventListener("__lighthouse-tab-ready", handler);
      return () => document.removeEventListener("__lighthouse-tab-ready", handler);
    }, []);
    const Comp = window.LighthouseTab_Detail;
    if (!Comp) return <div className="skeleton-note"><span className="tdot" />Lighthouse 탭 모듈 로딩 중…</div>;
    return <Comp />;
  }

  function FigmaTab() {
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => {
      const handler = () => force();
      document.addEventListener("__figma-tab-ready", handler);
      return () => document.removeEventListener("__figma-tab-ready", handler);
    }, []);
    const Comp = window.FigmaTab_Detail;
    if (!Comp) return <div className="skeleton-note"><span className="tdot" />Figma 탭 모듈 로딩 중…</div>;
    return <Comp />;
  }

  // v0.15: 사이드카 plugin 탭 wrapper — plugin id 받아 entry 분기.
  function PluginTabWrapper({ pluginId }) {
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => {
      const handler = () => force();
      document.addEventListener("__plugin-tab-ready", handler);
      return () => document.removeEventListener("__plugin-tab-ready", handler);
    }, []);
    const Comp = window.PluginTab_Detail;
    if (!Comp) return <div className="skeleton-note"><span className="tdot" />Plugin 탭 모듈 로딩 중…</div>;
    const plugins = window.__PLUGINS_DATA ?? [];
    const entry = plugins.find((p) => (p.ok ? p.output.id : p.id) === pluginId);
    if (!entry) return <div className="skeleton-note"><span className="tdot" />plugin 누락: {pluginId}</div>;
    return <Comp entry={entry} />;
  }

  function App() {
    const [tab, setTab] = useState("summary");
    const pluginId = tab.startsWith("plugin:") ? tab.slice("plugin:".length) : null;
    return (
      <div className="shell">
        <Header />
        <Tabs tab={tab} setTab={setTab} />
        {/* 0.8.10 — 접근성: tabpanel 역할 + 활성 탭과 라벨 연결. */}
        <main id="tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} style={{marginTop: 8}}>
          {tab === "summary" && <Summary />}
          {tab === "code" && <CodeTab />}
          {tab === "lighthouse" && <LighthouseTab />}
          {tab === "figma" && <FigmaTab />}
          {pluginId && <PluginTabWrapper pluginId={pluginId} />}
        </main>
        <footer>
          <span>{PROJECT_NAME} · DSMonitor 리뷰</span>
          <span className="mono">{(() => {
            // 0.8.4 — dsmonitor 패키지 자체 version + buildDate 자동 일관.
            //   shell.ts 안 readDsMonitorMeta() 결과를 window.__DSMONITOR_META 로 inject.
            const meta = window.__DSMONITOR_META ?? { version: "unknown", buildDate: "—" };
            return `v${meta.version} · ${meta.buildDate}`;
          })()}</span>
        </footer>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
