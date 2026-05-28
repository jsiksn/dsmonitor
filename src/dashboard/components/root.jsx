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
    return (
      <nav className="tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
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

  function Card({ label, belowThreshold, tags, children, wide }) {
    return (
      <section className={`card${wide ? " wide" : ""}${belowThreshold ? " below-threshold" : ""}`}>
        <div className="card-head">
          <div className="card-label">{label}</div>
          <div className="card-tags">
            {belowThreshold && <span className="tag below"><span className="tdot" />기준 미달</span>}
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
              <div className="desc">SCSS · TS · DS 사용 규칙이 코드에 어느 정도 반영되어 있나</div>
            </div>
            <div className="stamp">측정 <span className="mono">{d.stamp.code}</span></div>
          </div>
          <div className="grid">
            <Card label="DS 커버리지" belowThreshold>
              <div className="numwrap"><span className="num warn">{pct(d.code.dsCoverage, 1)}</span><span className="unit">%</span></div>
              <div className="bar"><div className="bar-fill warn" style={{width: `${pct(d.code.dsCoverage)}%`}} /></div>
              <div className="bar-row"><span className="mono">DS 사용 {d.code.dsFilesUsing} / 전체 소비자 {d.code.dsTotalConsumer}</span><span>목표 ≥ 80%</span></div>
              <div className="card-desc">DS 컴포넌트를 import 하는 파일 비율. 높을수록 좋음.</div>
              <TrendReserved note="↑ 상승 필요" />
            </Card>

            <Card label="금지 CSS 클래스 개수" belowThreshold>
              <div className="numwrap"><span className="num warn">{d.code.forbiddenTotal.toLocaleString()}</span><span className="unit">건</span></div>
              <div className="emph-row"><span className="k">bootstrap-utilities</span><span className="v">{d.code.forbiddenBootstrap}</span></div>
              <div className="emph-row"><span className="k">tailwind-classes</span><span className="v">{d.code.forbiddenTailwind}</span></div>
              <div className="card-hint"><ArrowDown /><span><strong>감소 필요 · 기준 0 건.</strong> 파일별 Top 20 은 Code 탭에서 확인.</span></div>
              <TrendReserved note="↓ 감소 필요" />
            </Card>

            <Card label="TypeScript 마이그레이션" belowThreshold>
              <div className="numwrap"><span className="num warn">{pct(d.code.tsRatio, 1)}</span><span className="unit">%</span></div>
              <div className="bar"><div className="bar-fill bad" style={{width: `${pct(d.code.tsRatio)}%`}} /></div>
              <div className="bar-row"><span className="mono">{d.code.tsFiles} ts / {d.code.tsFiles + d.code.jsFiles} 전체</span><span>목표 ≥ 90%</span></div>
              <div className="card-hint"><ArrowUp /><span><strong>상승 필요</strong> — 대부분 JS. 디렉토리별 분포는 Code 탭에서 확인 (Top: apps/ecosystem · apps/material · store).</span></div>
              <TrendReserved note="↑ 상승 필요" />
            </Card>
          </div>
        </div>

        {d.lh && <div className="layer">
          <div className="layer-head">
            <div className="layer-title">
              <div className="layer-tag">Layer 02 / Lighthouse</div>
              <h2>런타임 품질</h2>
              <div className="desc">10개 관리자 페이지 · 각 3회 측정 median</div>
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
              return (
                <React.Fragment>
                  <Card label="Performance 평균" tags={<span className="tag met"><span className="tdot" />기준 도달</span>}>
                    <div className="numwrap"><span className="num good">{(d.lh.avgPerf * 100).toFixed(1)}</span><span className="unit">/ 100</span></div>
                    <div className="bar"><div className="bar-fill good" style={{width: `${d.lh.avgPerf * 100}%`}} /></div>
                    <div className="bar-row"><span>{measure} · 범위 {perfRange}</span><span>목표 ≥ 90</span></div>
                    <div className="card-desc">전체적으로 안정. 회귀 감시 용도로 관찰.</div>
                    <TrendReserved />
                  </Card>

                  <Card label="Accessibility 평균" belowThreshold>
                    <div className="numwrap"><span className="num warn">{(d.lh.avgA11y * 100).toFixed(1)}</span><span className="unit">/ 100</span></div>
                    <div className="bar"><div className="bar-fill warn" style={{width: `${d.lh.avgA11y * 100}%`}} /></div>
                    <div className="bar-row"><span>{measure} · 범위 {a11yRange}</span><span>목표 ≥ 90</span></div>
                    <div className="emph-row" style={{marginTop:8}}>
                      <span className="k">최저 · {d.lh.worst.url}</span>
                      <span className="v" style={{color:"var(--bad-ink)"}}>{(d.lh.worst.a11y * 100).toFixed(1)}</span>
                    </div>
                    <div className="card-hint"><ArrowUp /><span>컴포넌트 교체가 label · aria 개선으로 이어질 것으로 예상.</span></div>
                    <TrendReserved note="↑ 상승 필요" />
                  </Card>

                  <Card label="Best Practices · SEO" tags={<span className="tag met"><span className="tdot" />기준 도달</span>}>
                    <div style={{display:"flex", gap:24, alignItems:"flex-start", marginTop:4}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11, color:"var(--ink-3)", fontWeight:500, marginBottom:4}}>Best Practices</div>
                        <div className="numwrap" style={{margin:0}}>
                          <span className="num" style={{fontSize:32}}>{(d.lh.avgBP*100).toFixed(1)}</span>
                          <span className="unit" style={{fontSize:13}}>/ 100</span>
                        </div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:6}}>{measure}</div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>범위 {bpRange}</div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11, color:"var(--ink-3)", fontWeight:500, marginBottom:4}}>SEO</div>
                        <div className="numwrap" style={{margin:0}}>
                          <span className="num" style={{fontSize:32}}>{(d.lh.avgSeo*100).toFixed(1)}</span>
                          <span className="unit" style={{fontSize:13}}>/ 100</span>
                        </div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:6}}>{measure}</div>
                        <div style={{fontSize:11, color:"var(--ink-3)", marginTop:2}}>범위 {seoRange}</div>
                      </div>
                    </div>
                    <div className="card-desc" style={{marginTop:16}}>두 지표 모두 임계치 이상. 직접 개선 대상 아님.</div>
                    <TrendReserved />
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
            <Card label={`${d.figma.primaryLabel ?? "primary"} 토큰 매칭률 (Styles)`} belowThreshold>
              {(() => {
                // 0.8.0 — 분모 0 케이스 (DS 안 styles=0) NaN 표시 정정.
                const ratio = d.figma.dsNewTotal === 0 ? 0 : d.figma.dsNewMatched / d.figma.dsNewTotal;
                return (
                  <>
              <div className="numwrap">
                <span className="num warn">{pct(ratio, 1)}</span>
                <span className="unit">%</span>
                <span className="sub-num">· {d.figma.dsNewMatched} / {d.figma.dsNewTotal}</span>
              </div>
              <div className="bar"><div className="bar-fill warn" style={{width: `${ratio * 100}%`}} /></div>
                  </>
                );
              })()}
              <div className="bar-row"><span>primary DS 토큰 (Styles) 가 코드에 반영된 비율</span><span>목표 ↑</span></div>
              <div className="card-hint"><ArrowUp /><span><strong>상승 필요</strong> — Variables 는 plan 제약으로 미포함.</span></div>
              <TrendReserved note="↑ 상승 필요" />
            </Card>

            <Card label="DS 피그마 Instance 비중" belowThreshold>
              {(() => {
                const primaryLabel = d.figma.primaryLabel;
                const nonPrimaryLabels = d.figma.nonPrimaryLabels ?? [];
                const inPrimary = primaryLabel ? (d.figma.instanceSources[primaryLabel] ?? 0) : 0;
                const inNonPrimary = nonPrimaryLabels.reduce((s, l) => s + (d.figma.instanceSources[l] ?? 0), 0);
                const totalInst = inPrimary + inNonPrimary + d.figma.unmatchedInstances;
                const ratio = totalInst === 0 ? 0 : inPrimary / totalInst;
                return (
                  <React.Fragment>
                    <div className="numwrap"><span className="num warn">{(ratio*100).toFixed(1)}</span><span className="unit">%</span></div>
                    <div className="bar"><div className="bar-fill warn" style={{width: `${ratio*100}%`}} /></div>
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

            <Card label="DS 외부 Instance" belowThreshold>
              <div className="numwrap"><span className="num warn">{d.figma.unmatchedInstances}</span><span className="unit">건</span></div>
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
                  <Card label={out.summary.primary.label} belowThreshold={out.summary.primary.status === "bad"}>
                    <div className="numwrap">
                      <span className={`num ${cls(out.summary.primary.status)}`}>{out.summary.primary.value}</span>
                    </div>
                    {out.summary.primary.hint && <div className="card-desc">{out.summary.primary.hint}</div>}
                  </Card>
                  {(out.summary.secondary ?? []).map((c, i) => (
                    <Card key={i} label={c.label} belowThreshold={c.status === "bad"}>
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
        <main style={{marginTop: 8}}>
          {tab === "summary" && <Summary />}
          {tab === "code" && <CodeTab />}
          {tab === "lighthouse" && <LighthouseTab />}
          {tab === "figma" && <FigmaTab />}
          {pluginId && <PluginTabWrapper pluginId={pluginId} />}
        </main>
        <footer>
          <span>{PROJECT_NAME} · DSMonitor 리뷰</span>
          <span className="mono">v0.1 · 2026-04-24</span>
        </footer>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
