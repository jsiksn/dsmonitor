/**
 * "디렉토리에서 이름 조건에 맞는 최신 entry 찾기" 공유 유틸 (0.8.10).
 *
 * 옛 흐름: readdir + 필터 + lex 정렬 내림차순 패턴이 markdown 리포터 /
 * cli (figma-instances) / lighthouse-to-data 에 각각 복제.
 * 날짜가 파일명에 YYYY-MM-DD 로 박히는 관례라 lex 내림차순 = 최신.
 */
import { existsSync, readdirSync } from "node:fs";

export function findLatestName(
  dir: string,
  test: (name: string) => boolean,
  opts?: { dirsOnly?: boolean }
): string | null {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => (opts?.dirsOnly ? e.isDirectory() : true))
    .map((e) => e.name)
    .filter(test);
  if (entries.length === 0) return null;
  entries.sort();
  return entries[entries.length - 1];
}
