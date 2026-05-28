/* global React */
const { useState } = React;

// ---------- shared mini components ----------
function Direction({ kind, label }) {
  // 방향성만 표기 — Phase 어휘 없음
  const map = {
    "down-good":  { color: "var(--ink-2)", bg: "var(--bg-sunken)", arrow: "↓", text: "낮을수록 좋음" },
    "up-good":    { color: "var(--ink-2)", bg: "var(--bg-sunken)", arrow: "↑", text: "높을수록 좋음" },
    "neutral":    { color: "var(--ink-3)", bg: "var(--bg-sunken)", arrow: "—", text: "참고" },
  };
  const m = map[kind] || map.neutral;
  return (
    <span className="dir-pill" style={{ color: m.color, background: m.bg }}>
      <span className="dir-arrow">{m.arrow}</span>
      <span>{label || m.text}</span>
    </span>
  );
}

function StatusPill({ kind, label }) {
  // kind: 'below' (기준 미달, 빨강) / 'met' (기준 도달, 녹색) / 'note' (참고, 회색)
  const map = {
    "below": { cls: "status-below", text: label || "기준 미달" },
    "met":   { cls: "status-met",   text: label || "기준 도달" },
    "note":  { cls: "status-note",  text: label || "참고" },
  };
  const m = map[kind];
  if (!m) return null;
  return <span className={`status-pill ${m.cls}`}>{m.text}</span>;
}

function Disclosure({ summary, count, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
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

function FilePath({ path }) {
  // dim the directories, keep filename strong
  const parts = path.split("/");
  const file = parts.pop();
  return (
    <span className="filepath mono" title={path}>
      {parts.length > 0 && <span className="dir">{parts.join("/")}/</span>}
      <span className="leaf">{file}</span>
    </span>
  );
}

function HBar({ value, max, color, height = 8 }) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="hbar" style={{ height }}>
      <div className="hbar-fill" style={{ width: `${w}%`, background: color || "var(--ink-3)" }} />
    </div>
  );
}

// ---------- Section wrapper ----------
function Section({ id, field, title, status, direction, children }) {
  const cls = status?.kind === "below" ? " below" : status?.kind === "met" ? " met" : "";
  return (
    <section className={`csect${cls}`} id={id}>
      <header className="csect-head">
        <div className="csect-title-row">
          <h3>{title}</h3>
          <span className="csect-field mono">{field}</span>
          <span className="spacer" />
          {status && <StatusPill kind={status.kind} label={status.label} />}
          {direction && <Direction kind={direction.kind} label={direction.label} />}
        </div>
      </header>
      <div className="csect-body">{children}</div>
    </section>
  );
}

// ---------- 1. forbiddenClassCount ----------
function ForbiddenSection({ d, smd }) {
  const total = d.forbidden.total;
  const byId = d.forbidden.byId;
  const groups = Object.entries(byId).sort((a, b) => b[1] - a[1]);
  const maxFile = d.forbidden.topFiles[0]?.total || 1;
  return (
    <Section
      id="forbidden"
      field="forbiddenClassCount"
      title="금지 CSS 클래스"
      status={{ kind: "below", label: "기준 미달 · 목표 0" }}
      direction={{ kind: "down-good" }}
    >
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono">{total.toLocaleString()}</div>
          <div className="kv-unit">건</div>
          <div className="kv-cap">전체 위반 수</div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">위반 포함 파일</span>
            <span className="v mono">{d.smd.forbiddenFileCount}</span>
          </div>
          <div className="kv-row">
            <span className="k">전체 파일 대비</span>
            <span className="v mono">{(d.smd.forbiddenFileRatio * 100).toFixed(1)}%</span>
          </div>
          <div className="kv-row">
            <span className="k">전체 코드 파일</span>
            <span className="v mono">{d.smd.totalFiles}</span>
          </div>
        </div>
      </div>

      <div className="csect-subhead">
        <h4>그룹별 분포</h4>
        <span className="csect-field mono">byId</span>
      </div>
      <div className="dist">
        {groups.map(([id, count]) => {
          // 0.8.0 — 분모 0 가드 (forbidden 전체 0건 케이스).
          const pct = total === 0 ? 0 : (count / total) * 100;
          return (
            <div key={id} className="dist-row">
              <span className="mono">{id}</span>
              <div className="dbar"><div className="dbar-fill" style={{ width: `${pct}%`, background: "var(--bad)" }} /></div>
              <span className="v">{count.toLocaleString()} · {pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <Disclosure summary="파일별 Top 20 — 가장 많이 위반한 파일 보기" count={d.forbidden.topFiles.length}>
        <table className="ftable">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>파일</th>
              <th style={{ width: 60, textAlign: "right" }}>건수</th>
              <th style={{ width: 200 }}>분포</th>
            </tr>
          </thead>
          <tbody>
            {d.forbidden.topFiles.map((f, i) => (
              <tr key={f.file}>
                <td className="mono dim">{i + 1}</td>
                <td><FilePath path={f.file} /></td>
                <td className="mono right">{f.total}</td>
                <td><HBar value={f.total} max={maxFile} color="var(--bad)" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>
    </Section>
  );
}

// ---------- 2. migrationCandidates ----------
function MigrationSection({ d }) {
  const m = d.mig;
  const targets = Object.entries(m.byTarget).sort((a, b) => b[1] - a[1]);
  const targetMax = Math.max(...targets.map(t => t[1]));
  const fileMax = m.topFiles[0]?.occurrences || 1;
  return (
    <Section
      id="migration"
      field="migrationCandidates"
      title="마이그레이션 후보 파일"
      status={{ kind: "below", label: "기준 미달 · 목표 0" }}
      direction={{ kind: "down-good" }}
    >
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono">{m.totalOccurrences}</div>
          <div className="kv-unit">건</div>
          <div className="kv-cap">전체 위반 (totalOccurrences)</div>
        </div>
        <div className="kv-big alt">
          <div className="kv-num mono">{m.totalFilesAffected}</div>
          <div className="kv-unit">파일</div>
          <div className="kv-cap">영향 파일 (totalFilesAffected)</div>
        </div>
      </div>

      <div className="csect-subhead">
        <h4>컴포넌트별 분포</h4>
        <span className="csect-field mono">byTarget</span>
        <span className="cross-ref-pill">↻ DS 커버리지 카드와 동일 데이터 (구체 작업 대상 시각)</span>
      </div>
      <div className="dist">
        {targets.map(([t, c]) => (
          <div key={t} className="dist-row">
            <span className="mono">{t}</span>
            <div className="dbar"><div className="dbar-fill" style={{ width: `${(c / targetMax) * 100}%`, background: "var(--bad)" }} /></div>
            <span className="v">{c} · {((c / m.totalOccurrences) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <Disclosure summary="파일별 Top 30 — 어떤 파일에 어떤 컴포넌트가 몰려 있는지" count={m.topFiles.length}>
        <table className="ftable">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>파일</th>
              <th style={{ width: 50, textAlign: "right" }}>건수</th>
              <th style={{ width: 220 }}>대상 컴포넌트</th>
              <th style={{ width: 140 }}>분포</th>
            </tr>
          </thead>
          <tbody>
            {m.topFiles.map((f, i) => (
              <tr key={f.file}>
                <td className="mono dim">{i + 1}</td>
                <td><FilePath path={f.file} /></td>
                <td className="mono right">{f.occurrences}</td>
                <td>
                  {f.targets.map(t => <span key={t} className="tag-mini">{t}</span>)}
                </td>
                <td><HBar value={f.occurrences} max={fileMax} color="var(--bad)" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>

      <Disclosure summary="코드 샘플 — 실제 위반 위치와 권장 교체" count={m.samples.length}>
        <div className="samples">
          {m.samples.slice(0, 12).map((s, i) => (
            <div key={i} className="sample">
              <div className="sample-meta">
                <FilePath path={s.file} />
                <span className="mono dim">:{s.line}</span>
              </div>
              <div className="sample-body">
                <span className="mono"><span className="tag-native">&lt;{s.nativeTag}&gt;</span> className="<span className="dim">{s.classSample}</span>"</span>
                <span className="arrow-r">→</span>
                <span className="mono"><span className="tag-suggest">{s.suggestedDs}</span></span>
              </div>
            </div>
          ))}
          {m.samples.length > 12 && (
            <div className="sample-more">+ {m.samples.length - 12} 개 더 — 풀 리스트는 baseline JSON 의 <span className="mono">migrationCandidates.samples</span></div>
          )}
        </div>
      </Disclosure>
    </Section>
  );
}

// ---------- 3. totals ----------
function TotalsSection({ d }) {
  const t = d.totals;
  const rows = [
    { k: "codeFiles", label: "코드 파일 (전체)", v: t.codeFiles },
    { k: "styleFiles", label: "스타일 파일", v: t.styleFiles },
    { k: "tsFiles", label: "TypeScript 파일", v: t.tsFiles },
    { k: "jsFiles", label: "JavaScript 파일", v: t.jsFiles },
    { k: "dsComponentFiles", label: "DS 컴포넌트 파일", v: t.dsComponentFiles },
    { k: "nonDsComponentFiles", label: "비-DS 컴포넌트 파일", v: t.nonDsComponentFiles },
  ];
  return (
    <Section id="totals" field="totals" title="파일 집계" status={{ kind: "note" }}>
      <div className="kv-big solo">
        <div className="kv-num mono">{t.codeFiles.toLocaleString()}</div>
        <div className="kv-unit">파일</div>
        <div className="kv-cap">전체 코드 파일</div>
      </div>
      <table className="ftable">
        <thead>
          <tr>
            <th>필드</th>
            <th>설명</th>
            <th style={{ width: 100, textAlign: "right" }}>값</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.k}>
              <td className="mono dim">{r.k}</td>
              <td>{r.label}</td>
              <td className="mono right">{r.v.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

// ---------- 4. stylingMethodDistribution ----------
function StylingMethodSection({ d }) {
  const s = d.smd;
  const total = s.totalFiles;
  // 새 형식: preferredCompliance 가 객체 (value, numerator, denominator, excluded)
  const pc = s.preferredCompliance;
  const pcValue = typeof pc === "object" ? pc.value : pc;
  const num = pc.numerator;
  const den = pc.denominator;
  const exc = pc.excluded;
  const allowedTotal = Object.values(s.counts.allowed).reduce((a, b) => a + b, 0);
  // 0.8.0 — 권장 방식 row 라벨은 preferredId 따라 동적 결정.
  //   고아 클래스 라벨은 preset 무관 표현으로 정정 ("SCSS 정의 못 찾음" → "정의 못 찾음").
  const preferredId = s.preferredId;
  const preferredAllowedCount = s.counts.allowed[preferredId] ?? 0;
  // 0.8.0 matrix — 신규 sub-key (apply-mixed / tailwind-via-wrapper / scss-style-raw-css).
  //   tooltip 사유는 preset 기준으로 본 row 의 title 안 그대로 노출.
  const applyMixedReason =
    preferredId === "scss"
      ? "@apply 유입 + raw CSS 혼합 — tailwind 의존 끌어옴"
      : preferredId === "tailwind"
      ? "@apply + raw CSS 혼합 — utility-first 위반"
      : "@apply 와 raw CSS 가 혼합된 클래스 정의";
  const rows = [
    { k: `allowed.${preferredId}`, label: `권장 (${preferredId})`,         v: preferredAllowedCount,              color: "var(--good)" },
    { k: "allowedGlobal",          label: "전역 허용",                       v: s.counts.allowedGlobal,             color: "oklch(0.65 0.06 200)" },
    { k: "noClass",                label: "className 없음 (스타일 안 씀)",    v: s.counts.noClass,                   color: "var(--ink-4)" },
    { k: "forbidden.bootstrap",    label: "금지 (bootstrap-utilities)",       v: s.counts.forbidden["bootstrap-utilities"] || 0, color: "var(--bad)" },
    { k: "forbidden.tailwind",     label: "금지 (tailwind-classes)",          v: s.counts.forbidden["tailwind-classes"] || 0,    color: "var(--bad)" },
    { k: "forbidden.apply-mixed",  label: "금지 (@apply-mixed)",              v: s.counts.forbidden["apply-mixed"] || 0,          color: "var(--bad)", title: applyMixedReason },
    { k: "forbidden.tailwind-via-wrapper", label: "금지 (Tailwind via wrapper)", v: s.counts.forbidden["tailwind-via-wrapper"] || 0, color: "var(--bad)", title: "pure-@apply wrapper class — tailwind 의존" },
    { k: "forbidden.scss-style-raw-css",   label: "금지 (raw CSS)",              v: s.counts.forbidden["scss-style-raw-css"] || 0,   color: "var(--bad)", title: "pure-css 클래스 — utility-first 위반" },
    { k: "orphanClass",            label: "고아 클래스 (정의 못 찾음)",       v: s.counts.orphanClass,               color: "var(--warn)" },
  ].sort((a, b) => b.v - a.v);

  return (
    <Section
      id="smd"
      field="stylingMethodDistribution"
      title="스타일링 방식 분포"
      status={{ kind: "below" }}
      direction={{ kind: "up-good", label: "preferred ↑ 높을수록 좋음" }}
    >
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono">{(pcValue * 100).toFixed(1)}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">권장 방식 준수율 (preferredCompliance)</div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">권장 방식 (preferredId)</span>
            <span className="v mono">{s.preferredId}</span>
          </div>
          <div className="kv-row">
            <span className="k">정상 스타일링 (분자)</span>
            <span className="v mono">{num.total} / {den.total}</span>
          </div>
          <div className="kv-row">
            <span className="k">금지 포함 파일</span>
            <span className="v mono">{s.forbiddenFileCount} ({(s.forbiddenFileRatio * 100).toFixed(1)}%)</span>
          </div>
          <div className="kv-row">
            <span className="k">기준 (good / warn)</span>
            <span className="v mono">≥ 80% / ≥ 50%</span>
          </div>
        </div>
      </div>

      {/* === 새 정의 캡션 === */}
      <div className="fnote" style={{ marginTop: 14 }}>
        <span className="fnote-icon">ⓘ</span>
        <span>
          분자: <strong>SCSS + allowedGlobal</strong> (정상 스타일링 방식 합) / 분모: + <strong>forbidden</strong> / 제외: <strong>orphanClass · noClass</strong> (정의 못 찾음 · 스타일 미사용 — 측정 대상 아님)
        </span>
      </div>

      {/* === preferredCompliance 분자/분모 명시 (접힘) === */}
      <Disclosure summary="preferredCompliance 계산식 — 펼쳐서 자세히 보기" count={`${(pcValue * 100).toFixed(1)}%`}>
      <div className="formula-box">
        <div className="formula-title">
          <span className="mono">preferredCompliance</span> 계산식
        </div>
        <div className="formula-eq">
          <span className="mono">{(pcValue * 100).toFixed(1)}%</span>
          <span className="formula-op">=</span>
          <span className="mono">{num.total} / {den.total}</span>
          <span className="formula-op">=</span>
          <span className="mono">({num.items.map(k => num.counts[k]).join(" + ")}) / ({den.items.map(k => den.counts[k]).join(" + ")})</span>
        </div>
        <div className="formula-rows">
          {num.items.map((k, i) => (
            <div key={`num-${k}`} className="formula-row">
              <span className="frole">{i === 0 ? "분자" : ""}</span>
              <span className="mono">{k}</span>
              <span className="fval mono">{num.counts[k]}</span>
              <span className="fdesc">{k === "scss" ? "권장 (scss) 파일" : k === "allowedGlobal" ? "전역 클래스 (정상 방식)" : ""}</span>
            </div>
          ))}
          <div className="formula-row" style={{ borderTop: "1px dashed var(--border)", paddingTop: 6 }}>
            <span className="frole"></span>
            <span className="mono"><strong>분자 합계</strong></span>
            <span className="fval mono"><strong>{num.total}</strong></span>
            <span className="fdesc"></span>
          </div>
          {den.items.map((k, i) => (
            <div key={`den-${k}`} className="formula-row">
              <span className="frole">{i === 0 ? "분모" : ""}</span>
              <span className="mono">{k}</span>
              <span className="fval mono">{den.counts[k]}</span>
              <span className="fdesc">{
                k === "scss" ? "권장" :
                k === "allowedGlobal" ? "정상 (분자에도 포함)" :
                k === "forbidden.bootstrap-utilities" ? "주 마이그레이션 대상" :
                k === "forbidden.tailwind-classes" ? "소수 (Phase B 대상)" : ""
              }</span>
            </div>
          ))}
          <div className="formula-row" style={{ borderTop: "1px dashed var(--border)", paddingTop: 6 }}>
            <span className="frole"></span>
            <span className="mono"><strong>분모 합계</strong></span>
            <span className="fval mono"><strong>{den.total}</strong></span>
            <span className="fdesc"></span>
          </div>
          {exc.items.map((k, i) => (
            <div key={`exc-${k}`} className="formula-row excluded">
              <span className="frole">{i === 0 ? "분모 제외" : ""}</span>
              <span className="mono">{k}</span>
              <span className="fval mono">{exc.counts[k]}</span>
              <span className="fdesc">{k === "orphanClass" ? "정의 못 찾은 className" : k === "noClass" ? "스타일 미사용 파일" : ""}</span>
            </div>
          ))}
        </div>
      </div>
      </Disclosure>

      <div className="stack-bar" title={`전체 ${total} 파일`}>
        {rows.map(r => (
          r.v > 0 && <div key={r.k} className="stack-seg" style={{ flex: r.v, background: r.color }} title={`${r.label}: ${r.v}`} />
        ))}
      </div>

      <div className="csect-subhead">
        <h4>방식별 카운트</h4>
        <span className="csect-field mono">counts</span>
        <span className="cross-ref-pill" style={{ marginLeft: "auto" }}>분모: {total} (전체 코드 파일)</span>
      </div>
      <div className="dist">
        {rows.map(r => {
          // 0.8.0 — 분모 0 가드. matrix forbidden row 는 사유를 tooltip 으로 표시.
          const pct = total === 0 ? 0 : (r.v / total) * 100;
          return (
            <div key={r.k} className="dist-row" title={r.title ?? r.label}>
              <span className="mono">{r.k}</span>
              <div className="dbar"><div className="dbar-fill" style={{ width: `${pct}%`, background: r.color }} /></div>
              <span className="v">{r.v} · {pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <div className="fnote" style={{ marginTop: 10 }}>
        <span className="fnote-icon">ⓘ</span>
        <span>
          <strong>orphanClass</strong>: “고아 클래스” — SCSS 정의를 찾을 수 없는 className. 아래 샘플에서 확인. <strong>noClass</strong>: className 자체를 쓰지 않는 파일. <strong>allowedGlobal</strong>: 앤 전역 CSS 클래스 (레이아웃 등).
        </span>
      </div>

      <Disclosure summary={`고아 클래스 샘플 — SCSS 정의 못 찾은 className (orphanClass)`} count={s.orphanSamples.length}>
        <table className="ftable">
          <thead>
            <tr>
              <th>className</th>
              <th style={{ width: 60, textAlign: "right" }}>건수</th>
              <th>샘플 파일</th>
            </tr>
          </thead>
          <tbody>
            {s.orphanSamples.map(o => (
              <tr key={o.className}>
                <td className="mono">.{o.className}</td>
                <td className="mono right">{o.occurrences}</td>
                <td>
                  {o.sampleFiles.map((f, i) => (
                    <div key={i}><FilePath path={f} /></div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>
    </Section>
  );
}

// ---------- 5. scssVariableCompliance ----------
function ScssSection({ d }) {
  const s = d.scss;
  const pct = s.compliance * 100;
  return (
    <Section
      id="scss"
      field="scssVariableCompliance"
      title="SCSS 변수 준수율"
      status={{ kind: "met", label: "기준 95% 도달" }}
    >
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono" style={{ color: "var(--good-ink)" }}>{pct.toFixed(1)}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">변수 사용 / (변수 + 하드코딩)</div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">변수 사용 (variableUsages)</span>
            <span className="v mono">{s.variableUsages}</span>
          </div>
          <div className="kv-row">
            <span className="k">하드코딩 (hardcodedLiterals)</span>
            <span className="v mono">{s.hardcodedLiterals}</span>
          </div>
          <div className="kv-row">
            <span className="k">목표</span>
            <span className="v mono">≥ 95%</span>
          </div>
        </div>
      </div>
      <div className="bar-track">
        <div className="bar-track-fill" style={{ width: `${pct}%`, background: "var(--good)" }} />
        <div className="bar-track-mark" style={{ left: "95%" }} title="목표 95%" />
      </div>
      <div className="bar-track-legend">
        <span>0%</span><span className="dim">목표 95%</span><span>100%</span>
      </div>
    </Section>
  );
}

// ---------- 6. hardcodedColors ----------
function HardcodedSection({ d }) {
  const h = d.hardcoded;
  const max = h.byFile[0]?.count || 1;
  return (
    <Section
      id="hardcoded"
      field="hardcodedColors"
      title="하드코딩 색상"
      status={{ kind: "below", label: "기준 미달 · 목표 0" }}
      direction={{ kind: "down-good" }}
    >
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono">{h.total}</div>
          <div className="kv-unit">건</div>
          <div className="kv-cap">전체 색상 리터럴 수</div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">발견된 파일</span>
            <span className="v mono">{h.byFile.length}</span>
          </div>
          <div className="kv-row">
            <span className="k">상위 파일 점유</span>
            <span className="v mono">{h.total === 0 ? "0.0" : ((h.byFile[0]?.count / h.total) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="csect-subhead">
        <h4>파일별 카운트 + 샘플</h4>
        <span className="csect-field mono">byFile</span>
      </div>
      <div className="hc-list">
        {h.byFile.map(f => (
          <div key={f.file} className="hc-row">
            <div className="hc-meta">
              <FilePath path={f.file} />
              <span className="mono hc-count">{f.count}</span>
            </div>
            <HBar value={f.count} max={max} color="var(--bad)" height={6} />
            <div className="hc-swatches">
              {f.samples.map((s, i) => (
                <span key={i} className="swatch" title={s}>
                  <span className="sw-color" style={{ background: s }} />
                  <span className="mono sw-text">{s}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------- 7. dsCoverage ----------
function DsCoverageSection({ d }) {
  const ds = d.ds;
  const m = d.mig;
  const fileMax = m.topFiles[0]?.occurrences || 1;
  const lastDir = (path) => {
    const parts = path.split("/");
    const file = parts.pop();
    const dir = parts.length ? parts[parts.length - 1] : "";
    return { dir, file };
  };
  return (
    <Section
      id="ds"
      field="dsCoverage"
      title="DS 커버리지"
      direction={{ kind: "up-good" }}
    >
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono">{(ds.coverage * 100).toFixed(1)}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">DS 사용 파일 / 전체 소비자 파일</div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">DS 사용 (filesUsingDs)</span>
            <span className="v mono">{ds.filesUsingDs}</span>
          </div>
          <div className="kv-row">
            <span className="k">전체 소비자 (totalConsumerFiles)</span>
            <span className="v mono">{ds.totalConsumerFiles}</span>
          </div>
          <div className="kv-row">
            <span className="k">미사용 파일</span>
            <span className="v mono">{ds.totalConsumerFiles - ds.filesUsingDs}</span>
          </div>
        </div>
      </div>

      <div className="bar-track">
        <div className="bar-track-fill" style={{ width: `${ds.coverage * 100}%`, background: "var(--good)" }} />
      </div>

      <Disclosure summary={`DS 대체 가능 파일 Top 30 — 펼쳐서 자세히 보기`} count={`영향 ${m.totalFilesAffected}개 · ${m.totalOccurrences}건`}>
      <div className="csect-subhead">
        <h4>DS 대체 가능 파일 Top 30</h4>
        <span className="csect-field mono">migrationCandidates.topFiles</span>
      </div>
      <p className="csect-desc" style={{ marginTop: 6, marginBottom: 8 }}>
        DS 안 쓰고 native HTML + 옛 클래스 쓰는 파일. 영향 파일 <span className="mono">{m.totalFilesAffected}</span>개 · 전체 occurrences <span className="mono">{m.totalOccurrences}</span>건.
        <span className="cross-ref"> ↻ Code 탭의 「마이그레이션 후보 파일」 카드와 동일 데이터 (<span className="mono">migrationCandidates</span>) — 거시 시각.</span>
      </p>

      <div className="dscov-list">
        {m.topFiles.map((f, i) => {
          const { dir, file } = lastDir(f.file);
          return (
            <div key={f.file} className="dscov-row" title={f.file}>
              <span className="mono dscov-rank">{String(i + 1).padStart(2, "0")}</span>
              <span className="dscov-path">
                <span className="dim mono">{dir}/</span>
                <span className="mono dscov-leaf">{file}</span>
              </span>
              <span className="dscov-targets">
                {f.targets.map(t => <span key={t} className="tag-mini">{t}</span>)}
              </span>
              <div className="dscov-bar">
                <HBar value={f.occurrences} max={fileMax} color="var(--bad)" height={5} />
              </div>
              <span className="mono dscov-count">{f.occurrences}</span>
            </div>
          );
        })}
      </div>
      </Disclosure>

      <Disclosure summary="코드 샘플 50건 보기 — file + line + nativeTag → suggestedDs + classSample" count={m.samples.length}>
        <div className="samples">
          {m.samples.map((s, i) => (
            <div key={i} className="sample">
              <div className="sample-meta">
                <FilePath path={s.file} />
                <span className="mono dim">:{s.line}</span>
              </div>
              <div className="sample-body">
                <span className="mono"><span className="tag-native">&lt;{s.nativeTag}&gt;</span> className="<span className="dim">{s.classSample}</span>"</span>
                <span className="arrow-r">→</span>
                <span className="mono"><span className="tag-suggest">{s.suggestedDs}</span></span>
              </div>
            </div>
          ))}
        </div>
      </Disclosure>
    </Section>
  );
}

// ---------- 8. tsMigration ----------
function TsSection({ d }) {
  const t = d.ts;
  const total = t.tsFiles + t.jsFiles;
  // 0.8.0 — 분모 0 가드 (tsFiles + jsFiles = 0 케이스).
  const pct = total === 0 ? 0 : (t.tsFiles / total) * 100;
  return (
    <Section
      id="ts"
      field="tsMigration"
      title="TypeScript 마이그레이션"
      status={{ kind: "below", label: `기준 미달 · 90%` }}
      direction={{ kind: "up-good" }}
    >
      <div className="kv-grid">
        <div className="kv-big">
          <div className="kv-num mono" style={{ color: "var(--bad-ink)" }}>{pct.toFixed(1)}</div>
          <div className="kv-unit">%</div>
          <div className="kv-cap">TS 파일 / 전체 코드 파일</div>
        </div>
        <div className="kv-side">
          <div className="kv-row">
            <span className="k">TS 파일 (tsFiles)</span>
            <span className="v mono">{t.tsFiles}</span>
          </div>
          <div className="kv-row">
            <span className="k">JS 파일 (jsFiles)</span>
            <span className="v mono">{t.jsFiles}</span>
          </div>
          <div className="kv-row">
            <span className="k">전체</span>
            <span className="v mono">{total}</span>
          </div>
          <div className="kv-row">
            <span className="k">기준</span>
            <span className="v mono">≥ 90%</span>
          </div>
        </div>
      </div>

      <div className="bar-track">
        <div className="bar-track-fill" style={{ width: `${pct}%`, background: "var(--bad)" }} />
        <div className="bar-track-mark" style={{ left: "90%" }} title="기준 90%" />
      </div>
      <div className="bar-track-legend">
        <span className="mono dim">{t.tsFiles} ts</span>
        <span className="mono dim">기준 90%</span>
        <span className="mono dim">{t.jsFiles} js</span>
      </div>

      {Array.isArray(t.byDir) && t.byDir.length > 0 && <TsByDir t={t} />}
    </Section>
  );
}

function TsByDir({ t }) {
  // baseline 은 jsFiles 내림차순 정렬됨. Top 7 + 펼침으로 17행.
  const all = t.byDir;
  const top = all.slice(0, 7);
  // 우선 작업 후보: jsFiles ≥ 30 이면서 tsFiles == 0 (중요한 디렉토리인데 TS 0%)
  const isPriority = (r) => r.jsFiles >= 30 && r.tsFiles === 0;

  const Row = ({ r }) => {
    const tsW = r.totalFiles > 0 ? (r.tsFiles / r.totalFiles) * 100 : 0;
    const jsW = 100 - tsW;
    const pri = isPriority(r);
    return (
      <div className="tsdir-row" title={`${r.dir} — ts ${r.tsFiles} / js ${r.jsFiles} / total ${r.totalFiles}`}>
        <span className="mono tsdir-name">{r.dir}</span>
        <div className="tsdir-bar" aria-hidden>
          {tsW > 0 && <span className="tsdir-seg ts" style={{ width: `${tsW}%` }} />}
          {jsW > 0 && <span className="tsdir-seg js" style={{ width: `${jsW}%` }} />}
        </div>
        <span className="mono tsdir-count">
          <span className="ts-num">{r.tsFiles}</span>
          <span className="dim"> / </span>
          <span>{r.totalFiles}</span>
          <span className="dim"> ({(r.ratio * 100).toFixed(1)}%)</span>
        </span>
        {pri ? <span className="tsdir-pri">↓ 우선</span> : <span className="tsdir-pri-spacer" />}
      </div>
    );
  };

  return (
    <>
      <div className="csect-subhead">
        <h4>디렉토리별 분포</h4>
        <span className="csect-field mono">tsMigration.byDir</span>
        <span className="cross-ref-pill" style={{ marginLeft: "auto" }}>JS 비중 높은 디렉토리 우선</span>
      </div>
      <div className="tsdir-legend">
        <span className="tsdir-legend-item"><span className="sw ts" /> TS</span>
        <span className="tsdir-legend-item"><span className="sw js" /> JS (작업 대상)</span>
        <span className="dim" style={{ marginLeft: "auto", fontSize: 11 }}>↓ 우선 = jsFiles ≥ 30 · tsFiles 0</span>
      </div>
      <div className="tsdir-list">
        {top.map(r => <Row key={r.dir} r={r} />)}
      </div>
      <Disclosure summary={`나머지 ${all.length - top.length} 디렉토리 보기 (Top 7 외)`} count={all.length - top.length}>
        <div className="tsdir-list">
          {all.slice(top.length).map(r => <Row key={r.dir} r={r} />)}
        </div>
      </Disclosure>
    </>
  );
}

// ---------- main CodeTab ----------
// v0.10 (2026-04-29): 카드 컴포넌트 배열로 분리. window.CodeTab_CardCount 자동 export.
// 카드 추가/제거 시 root.jsx Tabs 의 카운트 자동 반영 — hardcoded 동기화 의무 제거.
// 0.8.0 — 테마별 그룹화 흐름으로 카드 순서 재정렬.
//   scope 개요         : 파일 집계 / DS 커버리지
//   마이그레이션      : 마이그레이션 후보 파일 / TypeScript 마이그레이션
//   CSS 컴플라이언스 : 금지 CSS 클래스 / 스타일링 방식 분포
//   변수 + 색상      : SCSS 변수 준수율 / 하드코딩 색상
const CODE_CARD_SECTIONS = [
  TotalsSection,        // 1 파일 집계
  DsCoverageSection,    // 2 DS 커버리지
  MigrationSection,     // 3 마이그레이션 후보 파일
  TsSection,            // 4 TypeScript 마이그레이션
  ForbiddenSection,     // 5 금지 CSS 클래스
  StylingMethodSection, // 6 스타일링 방식 분포
  ScssSection,          // 7 SCSS 변수 준수율
  HardcodedSection,     // 8 하드코딩 색상
];

function CodeTab() {
  const d = window.__CODE_DATA;
  if (!d) return <div className="skeleton-note">데이터 로딩 중…</div>;
  // v0.15: 측정 시점 인라인 (Figma 패턴 일치). __SUMMARY_DATA.stamp.code 활용.
  const stamp = window.__SUMMARY_DATA?.stamp?.code ?? "—";
  return (
    <div className="code-tab">
      <div className="tab-stamp">
        <span className="mono dim">측정</span>
        <span className="mono">{stamp}</span>
      </div>
      {CODE_CARD_SECTIONS.map((S, i) => <S key={i} d={d} />)}
    </div>
  );
}

window.CodeTab_Detail = CodeTab;
window.CodeTab_CardCount = CODE_CARD_SECTIONS.length;
document.dispatchEvent(new Event("__code-tab-ready"));
