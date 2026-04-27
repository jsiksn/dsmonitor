import type { FrameworkAdapter } from "./types";
import { reactAdapter } from "./react";

/**
 * 등록된 프레임워크 어댑터 레지스트리.
 * 새 어댑터 추가 시:
 *   1. src/frameworks/<id>.ts 에 FrameworkAdapter 구현
 *   2. 여기에 import하고 ADAPTERS에 등록
 *   3. README의 "지원 스택"에 id 추가
 */
const ADAPTERS: Record<string, FrameworkAdapter> = {
  [reactAdapter.id]: reactAdapter,
};

export function getFrameworkAdapter(id: string): FrameworkAdapter {
  const a = ADAPTERS[id];
  if (!a) {
    const available = Object.keys(ADAPTERS).join(", ");
    throw new Error(
      `Unknown framework "${id}". Available adapters: ${available}`
    );
  }
  return a;
}

export function listFrameworks(): string[] {
  return Object.keys(ADAPTERS);
}

export type { FrameworkAdapter };
