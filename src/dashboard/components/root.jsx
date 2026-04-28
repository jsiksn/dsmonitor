/* global React */
// VitaUI Dashboard — root JSX. 시안 (Claude Design 핸드오프) 의 root mount 코드 그대로
// + const DATA hardcoded → window.__SUMMARY_DATA 로 변경 (자동 변환).
//
// 원본 시안: ui-health/project/Phase 0.5 Review Dashboard.html L532-862
// 변경: const DATA = { ... }; 하드코딩 블록 제거, const DATA = window.__SUMMARY_DATA 로 대체.

const { useState } = React;

const DATA = window.__SUMMARY_DATA;


  const pct = (x, d = 1) => (x * 100).toFixed(d);

  function Header() {
    return (
      <header className="hdr">
        <div>
          <div className="hdr-title">
            <div className="hdr-logo">UI</div>
            <div>
              <h1>VitaUI 리뷰</h1>
              <div className="sub">portal-gateway-web · UI 건강 상태 스냅샷</div>
            </div>
          </div>
        </div>
        <div className="hdr-meta">
          <div className="meta-col">
            <div className="k">측정 시점</div>
            <div className="v">
              Code <span className="mono">2026-04-28</span><br/>
              Figma <span className="mono">2026-04-24</span><br/>
              Lighthouse <span className="mono">2026-04-22</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  function Tabs({ tab, setTab }) {
    const tabs = [
      { id: "summary", label: "Summary" },
      { id: "code", label: "Code", count: "8 섹션" },
      { id: "lighthouse", label: "Lighthouse", count: "10 URL" },
      { id: "figma", label: "Figma", count: "4 섹션" },
    ];
    return (
      <nav className="tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
            {t.label}
            {t.count && <span className="count">{t.count}</span>}
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
              <div className="bar-row"><span className="mono">DS 사용 {d.code.dsFilesUsing} / 전체 소비자 {d.code.dsTotalConsumer}</span><span>목표 ↑</span></div>
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
              <div className="bar-row"><span className="mono">{d.code.tsFiles} ts / {d.code.tsFiles + d.code.jsFiles} 전체</span><span>기준 ≥ 90%</span></div>
              <div className="card-hint"><ArrowUp /><span><strong>상승 필요</strong> — 대부분 JS. 디렉토리별 분포는 Code 탭에서 확인 (Top: apps/ecosystem · apps/material · store).</span></div>
              <TrendReserved note="↑ 상승 필요" />
            </Card>
          </div>
        </div>

        <div className="layer">
          <div className="layer-head">
            <div className="layer-title">
              <div className="layer-tag">Layer 02 / Lighthouse</div>
              <h2>런타임 품질</h2>
              <div className="desc">10개 관리자 페이지 · 각 3회 측정 median</div>
            </div>
            <div className="stamp">측정 <span className="mono">{d.stamp.lighthouse}</span></div>
          </div>
          <div className="grid">
            <Card label="Performance 평균" tags={<span className="tag met"><span className="tdot" />기준 도달</span>}>
              <div className="numwrap"><span className="num good">{(d.lh.avgPerf * 100).toFixed(1)}</span><span className="unit">/ 100</span></div>
              <div className="bar"><div className="bar-fill good" style={{width: `${d.lh.avgPerf * 100}%`}} /></div>
              <div className="bar-row"><span>10 URL · {d.lh.runs}-run median</span><span>범위 88 – 93</span></div>
              <div className="card-desc">전체적으로 안정. 회귀 감시 용도로 관찰.</div>
              <TrendReserved />
            </Card>

            <Card label="Accessibility 평균" belowThreshold>
              <div className="numwrap"><span className="num warn">{(d.lh.avgA11y * 100).toFixed(1)}</span><span className="unit">/ 100</span></div>
              <div className="bar"><div className="bar-fill warn" style={{width: `${d.lh.avgA11y * 100}%`}} /></div>
              <div className="bar-row"><span>10 URL 평균</span><span>목표 ≥ 90</span></div>
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
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11, color:"var(--ink-3)", fontWeight:500, marginBottom:4}}>SEO</div>
                  <div className="numwrap" style={{margin:0}}>
                    <span className="num" style={{fontSize:32}}>{(d.lh.avgSeo*100).toFixed(1)}</span>
                    <span className="unit" style={{fontSize:13}}>/ 100</span>
                  </div>
                </div>
              </div>
              <div className="card-desc" style={{marginTop:16}}>두 지표 모두 임계치 이상. 직접 개선 대상 아님.</div>
              <TrendReserved />
            </Card>
          </div>
        </div>

        <div className="layer">
          <div className="layer-head">
            <div className="layer-title">
              <div className="layer-tag">Layer 03 / Figma</div>
              <h2>디자인 시스템 일치성</h2>
              <div className="desc">토큰 · 컴포넌트 instance 가 코드에 얼마나 반영되어 있나</div>
            </div>
            <div className="stamp">측정 <span className="mono">{d.stamp.figma}</span></div>
          </div>
          <div className="grid">
            <Card label="ds-new 토큰 매칭률 (Styles)" belowThreshold>
              <div className="numwrap">
                <span className="num warn">{pct(d.figma.dsNewMatched / d.figma.dsNewTotal, 1)}</span>
                <span className="unit">%</span>
                <span className="sub-num">· {d.figma.dsNewMatched} / {d.figma.dsNewTotal}</span>
              </div>
              <div className="bar"><div className="bar-fill warn" style={{width: `${(d.figma.dsNewMatched / d.figma.dsNewTotal) * 100}%`}} /></div>
              <div className="bar-row"><span>새 DS 토큰 (Styles) 가 코드에 반영된 비율</span></div>
              <div className="card-hint"><ArrowUp /><span><strong>상승 필요</strong> — Variables 는 plan 제약으로 미포함.</span></div>
              <TrendReserved note="↑ 상승 필요" />
            </Card>

            <Card label="DS 피그마 Instance 비중" belowThreshold>
              {(() => {
                const inNew = d.figma.instanceSources["ds-new"];
                const inLegacy = d.figma.instanceSources["ds-legacy"];
                const totalInst = inNew + inLegacy + d.figma.unmatchedInstances;
                const ratio = inNew / totalInst;
                return (
                  <React.Fragment>
                    <div className="numwrap"><span className="num warn">{(ratio*100).toFixed(1)}</span><span className="unit">%</span></div>
                    <div className="bar"><div className="bar-fill warn" style={{width: `${ratio*100}%`}} /></div>
                    <div className="bar-row"><span className="mono">Primary (ds-new) {inNew.toLocaleString()} / 전체 {totalInst.toLocaleString()}</span><span>목표 ↑</span></div>
                    <div className="card-desc">전체 instance 중 primary DS (ds-new) 사용 비율. ds-legacy 84.1%, unmatched 0.3% 는 Figma 탭 통합 카드에서 분포 확인.</div>
                  </React.Fragment>
                );
              })()}
              <TrendReserved note="↑ 상승 필요" />
            </Card>

            <Card label="DS 외부 Instance" belowThreshold>
              <div className="numwrap"><span className="num warn">{d.figma.unmatchedInstances}</span><span className="unit">건</span></div>
              <div className="emph-row"><span className="k">전체 instance</span><span className="v">{d.figma.totalInstances.toLocaleString()}</span></div>
              <div className="emph-row"><span className="k">ds-legacy 사용</span><span className="v">{d.figma.instanceSources["ds-legacy"].toLocaleString()}</span></div>
              <div className="emph-row"><span className="k">ds-new 사용</span><span className="v">{d.figma.instanceSources["ds-new"].toLocaleString()}</span></div>
              <div className="card-hint"><ArrowDown /><span>어떤 DS 에도 속하지 않은 instance. <strong>1차 마이그레이션 대상</strong>.</span></div>
              <TrendReserved note="↓ 감소 필요" />
            </Card>
          </div>
        </div>
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

  function App() {
    const [tab, setTab] = useState("summary");
    return (
      <div className="shell">
        <Header />
        <Tabs tab={tab} setTab={setTab} />
        <main style={{marginTop: 8}}>
          {tab === "summary" && <Summary />}
          {tab === "code" && <CodeTab />}
          {tab === "lighthouse" && <LighthouseTab />}
          {tab === "figma" && <FigmaTab />}
        </main>
        <footer>
          <span>portal-gateway-web · VitaUI 리뷰</span>
          <span className="mono">v0.1 · 2026-04-24</span>
        </footer>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
