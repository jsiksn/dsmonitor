/* global React */
// DSMonitor Dashboard — Lighthouse 탭. 시안 (Claude Design 핸드오프) 의 lighthouse-tab.jsx
// 의 React.createElement IIFE 형식을 JSX 로 변환. 동작 동일.

const { useState: useStateLh } = React;

// ---------- helpers ----------
function lhScoreCls(score01) {
  const n = score01 * 100;
  return n >= 90 ? "g" : n >= 75 ? "w" : "b";
}
function lhBadgeFromScore(score01) {
  const n = score01 * 100;
  if (n >= 90) return { kind: "met", text: "기준 도달" };
  if (n >= 75) return { kind: "note", text: "참고" };
  return { kind: "below", text: "기준 미달" };
}
function lhFmtMs(v) {
  if (v == null) return "—";
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${(v / 1000).toFixed(2)} s`;
}
function lhFmtCls(v) { return v.toFixed(3); }

// CWV thresholds
const CWV = {
  LCP:  { unit: "ms",   good: 2500, ni: 4000, fmt: lhFmtMs,  desc: "Largest Contentful Paint" },
  FCP:  { unit: "ms",   good: 1800, ni: 3000, fmt: lhFmtMs,  desc: "First Contentful Paint" },
  CLS:  { unit: "score",good: 0.1,  ni: 0.25, fmt: lhFmtCls, desc: "Cumulative Layout Shift" },
  TBT:  { unit: "ms",   good: 200,  ni: 600,  fmt: lhFmtMs,  desc: "Total Blocking Time" },
  SI:   { unit: "ms",   good: 3400, ni: 5800, fmt: lhFmtMs,  desc: "Speed Index" },
  TTI:  { unit: "ms",   good: 3800, ni: 7300, fmt: lhFmtMs,  desc: "Time to Interactive" },
};
function cwvCls(metric, v) {
  const t = CWV[metric];
  if (v <= t.good) return "g";
  if (v <= t.ni) return "w";
  return "b";
}

// ---------- shared subcomponents ----------
function ScoreChip({ score01 }) {
  const cls = lhScoreCls(score01);
  return <span className={`chip ${cls}`}>{(score01 * 100).toFixed(1)}</span>;
}

function LhTag({ kind, text }) {
  return (
    <span className={`tag ${kind}`}>
      <span className="tdot" />{text}
    </span>
  );
}

function LhSectionHead({ title, field, badge, count }) {
  return (
    <div className="lh-sect-head">
      <div className="lh-sect-titles">
        <h3>{title}</h3>
        <span className="field mono">{field}</span>
      </div>
      <div className="lh-sect-meta">
        {count && <span className="pill">{count}</span>}
        {badge && <LhTag kind={badge.kind} text={badge.text} />}
      </div>
    </div>
  );
}

// ---------- Section 1 — URL × Category Matrix ----------
function MatrixSection({ urls, averages }) {
  return (
    <section className="lh-sect">
      <LhSectionHead
        title="URL × 카테고리 매트릭스"
        field="lighthouse.matrix"
        count={`${urls.length} 행 × 4 열`}
      />
      <p className="lh-desc">
        Lighthouse 표준 임계: <span className="lh-thr g">녹색 ≥ 90</span>
        <span className="lh-thr w">노랑 75–89</span>
        <span className="lh-thr b">빨강 &lt; 75</span>
      </p>
      <div className="lh-matrix">
        <div className="mh url-h">URL</div>
        <div className="mh num-h">Perf</div>
        <div className="mh num-h">A11y</div>
        <div className="mh num-h">BP</div>
        <div className="mh num-h">SEO</div>
        {urls.map((r, i) => (
          <React.Fragment key={i}>
            <div className="url">{r.path}</div>
            <div className="score"><ScoreChip score01={r.perf} /></div>
            <div className="score"><ScoreChip score01={r.a11y} /></div>
            <div className="score"><ScoreChip score01={r.bp} /></div>
            <div className="score"><ScoreChip score01={r.seo} /></div>
          </React.Fragment>
        ))}
        <div className="url avg-row">평균 ({urls.length} URL)</div>
        <div className="score avg-row"><ScoreChip score01={averages.perf} /></div>
        <div className="score avg-row"><ScoreChip score01={averages.a11y} /></div>
        <div className="score avg-row"><ScoreChip score01={averages.bp} /></div>
        <div className="score avg-row"><ScoreChip score01={averages.seo} /></div>
      </div>
    </section>
  );
}

// ---------- Sections 2–5 — Category breakdown ----------
function CategorySection({ title, field, metric, urls, average, runs }) {
  const sorted = [...urls].sort((a, b) => a[metric] - b[metric]);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const badge = lhBadgeFromScore(average);
  const min = Math.min(...urls.map(u => u[metric]));
  const max = Math.max(...urls.map(u => u[metric]));
  // 0.8.8 — 옛 시안 잔재 hint prop (점수와 무관한 소견 리터럴) 제거.
  //   데이터로 검증되는 사실만 hint 로 표시: 전 URL 동일 점수 케이스.
  const hint =
    urls.length > 1 && min === max
      ? `${urls.length} URL 모두 동일 점수 (${(min * 100).toFixed(1)}).`
      : null;
  return (
    <section className={`lh-sect${badge.kind === "below" ? " below-threshold" : ""}`}>
      <LhSectionHead title={title} field={field} badge={badge} />
      <div className="lh-cat-summary">
        <div className="lh-cat-num-block">
          <div className="lh-cat-num-row">
            <span className={`lh-num ${lhScoreCls(average)}`}>{(average * 100).toFixed(1)}</span>
            <span className="lh-unit">{" / 100"}</span>
          </div>
          <div className="lh-cat-num-meta">
            {/* v0.10 note 10: Summary 탭 "10 URL · 3-run median" 표기와 일관성. */}
            <span>{runs != null ? `${urls.length} URL · ${runs}-run median` : `${urls.length} URL median 평균`}</span>
            <span className="sep">·</span>
            <span>{`범위 ${(min*100).toFixed(1)} – ${(max*100).toFixed(1)}`}</span>
          </div>
        </div>
        <div className="lh-cat-extremes">
          <div className="lh-extreme good">
            <div className="lbl">최고</div>
            <div className="row">
              <span className="url mono">{highest.path}</span>
              <ScoreChip score01={highest[metric]} />
            </div>
          </div>
          <div className="lh-extreme bad">
            <div className="lbl">최저</div>
            <div className="row">
              <span className="url mono">{lowest.path}</span>
              <ScoreChip score01={lowest[metric]} />
            </div>
          </div>
        </div>
      </div>
      <div className="lh-cat-bars">
        {urls.map((r, i) => {
          const v = r[metric] * 100;
          const cls = lhScoreCls(r[metric]);
          return (
            <div key={i} className="lh-cat-row">
              <div className="url mono">{r.path}</div>
              <div className="lh-cat-track">
                <div className={`lh-cat-fill ${cls}`} style={{ width: `${v}%` }} />
                <div className="lh-cat-th g" style={{ left: "90%" }} title="≥ 90" />
                <div className="lh-cat-th w" style={{ left: "75%" }} title="≥ 75" />
              </div>
              <div className={`lh-cat-val ${cls}`}>{v.toFixed(1)}</div>
            </div>
          );
        })}
      </div>
      {hint && <div className="lh-cat-hint">{hint}</div>}
    </section>
  );
}

// ---------- Section 6 — CWV ----------
// v0.9 note 13: cwvSample 단일 객체 → 배열. 모든 URL 의 6 메트릭 풀 표 표시.
function CwvSection({ sample, totalUrls }) {
  const [open, setOpen] = useStateLh(false);
  const samples = Array.isArray(sample) ? sample : [];
  if (samples.length === 0) {
    return (
      <section className="lh-sect">
        <LhSectionHead
          title="Core Web Vitals (raw)"
          field="audits.*.numericValue"
          count={`0 / ${totalUrls} URL`}
        />
        <div className="lh-cwv-note">
          현재 raw report 가 수집되지 않음. <strong>다음 측정 시 추가 수집 예정</strong>.
        </div>
      </section>
    );
  }
  const order = ["LCP", "FCP", "CLS", "TBT", "SI", "TTI"];
  return (
    <section className="lh-sect">
      <LhSectionHead
        title="Core Web Vitals (raw)"
        field="audits.*.numericValue"
        count={`${samples.length} / ${totalUrls} URL`}
      />
      <div className="lh-cwv-table">
        <div className="row head">
          <span className="url-h">URL</span>
          {order.map((k) => (
            <span key={k} className="num-h" title={CWV[k].desc}>{k}</span>
          ))}
        </div>
        {samples.map((s, i) => {
          const vals = { LCP: s.lcp, FCP: s.fcp, CLS: s.cls, TBT: s.tbt, SI: s.si, TTI: s.tti };
          return (
            <div key={i} className="row">
              <span className="url mono">{s.url}</span>
              {order.map((k) => {
                const v = vals[k];
                const cls = cwvCls(k, v);
                return (
                  <span key={k} className={`num mono ${cls}`} title={`${CWV[k].desc} · 좋음 ≤ ${CWV[k].fmt(CWV[k].good)} · 나쁨 > ${CWV[k].fmt(CWV[k].ni)}`}>
                    {CWV[k].fmt(v)}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="lh-cwv-foot">
        <button className="lh-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {open ? "▾ 임계 기준 접기" : "▸ 임계 기준 풀 테이블 보기"}
        </button>
      </div>
      {open && (
        <div className="lh-cwv-thr-table">
          <div className="row head">
            <span>지표</span>
            <span>설명</span>
            <span>좋음</span>
            <span>개선 필요</span>
            <span>나쁨</span>
          </div>
          {order.map((k) => {
            const t = CWV[k];
            return (
              <div key={k} className="row">
                <span className="mono">{k}</span>
                <span className="muted">{t.desc}</span>
                <span className="mono g">{`≤ ${t.fmt(t.good)}`}</span>
                <span className="mono w">{`${t.fmt(t.good)} – ${t.fmt(t.ni)}`}</span>
                <span className="mono b">{`> ${t.fmt(t.ni)}`}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------- root ----------
function LighthouseTabDetail() {
  const d = window.__LH_DATA;
  if (!d) {
    return (
      <div className="skeleton-note">
        <span className="tdot" />Lighthouse 데이터 로딩 실패
      </div>
    );
  }
  return (
    <div className="lh-tab">
      {/* v0.15: 측정 시점 박스 → 인라인 (Figma 패턴 일치). URL / Run / Base URL 박스는 정보 부분 그대로 유지. */}
      <div className="tab-stamp">
        <span className="mono dim">측정</span>
        <span className="mono">{d.measuredAt}</span>
      </div>
      <div className="lh-context">
        <div>
          <span className="k">측정 URL</span>
          <span className="v mono">{`${d.totalUrls} 페이지`}</span>
        </div>
        <div>
          <span className="k">Run / URL</span>
          <span className="v mono">{`${d.numberOfRuns} 회 (median)`}</span>
        </div>
        <div>
          <span className="k">Base URL</span>
          <span className="v mono">{d.baseUrl}</span>
        </div>
      </div>

      <MatrixSection urls={d.urls} averages={d.averages} />

      {/* 0.8.8 — 상세 섹션 순서를 매트릭스 열 순서 (Perf / A11y / BP / SEO) 와 통일.
          옛 흐름: A11y 가 첫 번째라 같은 탭 안에서 지표 순서가 어긋났음.
          hint 리터럴 (시안 소견) 은 CategorySection 내부 실계산으로 대체. */}
      <CategorySection
        title="Performance" field="lighthouse.perf" metric="perf"
        urls={d.urls} average={d.averages.perf} runs={d.numberOfRuns}
      />
      <CategorySection
        title="Accessibility" field="lighthouse.a11y" metric="a11y"
        urls={d.urls} average={d.averages.a11y} runs={d.numberOfRuns}
      />
      <CategorySection
        title="Best Practices" field="lighthouse.bp" metric="bp"
        urls={d.urls} average={d.averages.bp} runs={d.numberOfRuns}
      />
      <CategorySection
        title="SEO" field="lighthouse.seo" metric="seo"
        urls={d.urls} average={d.averages.seo} runs={d.numberOfRuns}
      />

      <CwvSection sample={d.cwvSample} totalUrls={d.totalUrls} />
    </div>
  );
}

window.LighthouseTab_Detail = LighthouseTabDetail;
document.dispatchEvent(new Event("__lighthouse-tab-ready"));
