/**
 * JSON 파일 읽기 + 파싱 방어 공유 유틸 (0.8.10).
 *
 * 옛 흐름: baseline JSON 등을 `JSON.parse(readFile(...))` 로 무방어 파싱하는
 * 지점이 5곳 (cli 3곳 / migrationCsv / dashboard render) — 손상 JSON 시 raw
 * SyntaxError 스택이 그대로 노출됐음. plugins/loader.ts 류의 친절 메시지 방식과
 * 일관되게 통일.
 */
import fs from "node:fs/promises";

export async function readJsonFile<T>(absPath: string, what: string): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(absPath, "utf8");
  } catch (e) {
    throw new Error(
      `[dsmonitor] ${what} 파일을 읽지 못했습니다: ${absPath} — ${e instanceof Error ? e.message : String(e)}`
    );
  }
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(
      `[dsmonitor] ${what} JSON 파싱 실패: ${absPath}\n` +
        `  파일이 손상되었거나 수동 편집 중 형식이 깨졌을 수 있습니다. ` +
        `재측정 (npx dsmonitor audit) 으로 다시 생성해 보세요. ` +
        `(${e instanceof Error ? e.message : String(e)})`
    );
  }
}
