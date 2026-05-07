/* global React */
// DSMonitor Dashboard — Plugin 탭 (generic). 사이드카 plugin 의 정보 형식 약속대로
// 카드 + 표 자동 표시 + 검증 실패 시각화.
//
// 정보 inject: window.__PLUGINS_DATA = DashboardPluginEntry[]
// 본 컴포넌트는 단일 plugin entry 받음 — root.jsx 가 탭별로 분기.

function PluginTab({ entry }) {
  if (!entry.ok) {
    return <PluginErrorView id={entry.id} reason={entry.reason} />;
  }
  const { output, stale } = entry;
  // measuredAt 처리 — ISO 8601 → "YYYY-MM-DD HH:mm" 형식 (분 단위)
  const measuredAtFmt = (output.measuredAt || "").slice(0, 16).replace("T", " ");

  // details 표 컬럼 — 모든 행의 키 합집합 (name 제외, 알파벳 순)
  const cols = output.details?.length
    ? Array.from(
        new Set(
          output.details.flatMap((r) => Object.keys(r)).filter((k) => k !== "name")
        )
      )
    : [];

  return (
    <div>
      {/* 정정 3: 별도 헤더 (lh-sect-head) → 본문 시작 인라인 (Figma 패턴 일치). */}
      <div className="tab-stamp">
        <span className="mono dim">측정</span>
        <span className="mono">{measuredAtFmt || "—"}</span>
        {stale && (
          <>
            <span className="dim sep">·</span>
            <span className="tag stale"><span className="tdot" />정보 7일+ 오래됨</span>
          </>
        )}
      </div>

      {output.details && output.details.length > 0 ? (
        <table className="plugin-details">
          <thead>
            <tr>
              <th>name</th>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {output.details.map((row, i) => (
              <tr key={i}>
                <td className="mono">{row.name}</td>
                {cols.map((c) => (
                  <td key={c}>{row[c] != null ? String(row[c]) : ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="skeleton-note">
          <span className="tdot" />
          details 누락 — Summary 탭의 Layer 안에서 카드 부분 확인.
        </div>
      )}
    </div>
  );
}

function PluginErrorView({ id, reason }) {
  return (
    <div>
      {/* 정정 3 (B 안): lh-sect-head 통째 삭제 + 본문 직전 인라인 "검증 실패" 배지. 본문 카드 (사유 표시) 그대로 유지. */}
      <div className="tab-stamp">
        <span className="tag below"><span className="tdot" />검증 실패</span>
      </div>
      <section className="card below-threshold">
        <div className="card-head">
          <div className="card-label">plugin 정보 검증 실패</div>
        </div>
        <div style={{ padding: "8px 0", color: "var(--bad-ink)", fontSize: 13 }}>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>사유:</div>
          <div className="mono" style={{ fontSize: 12, wordBreak: "break-word" }}>{reason}</div>
        </div>
        <div className="card-desc" style={{ marginTop: 12 }}>
          <strong>해결 흐름:</strong> dsmonitor/reports/plugins/{id}/{`{date}.json`} 안
          필수 필드 (id / label / measuredAt / summary.primary) + JSON 형식 검증.
          plugin 개발자 측 가이드: <span className="mono">docs/plugin-development.md</span>.
        </div>
      </section>
    </div>
  );
}

// === root.jsx 동기화 (시안 lighthouse-tab.jsx / figma-tab.jsx 같은 패턴) ===
window.PluginTab_Detail = PluginTab;
document.dispatchEvent(new Event("__plugin-tab-ready"));
