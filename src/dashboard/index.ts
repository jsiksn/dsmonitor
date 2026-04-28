/**
 * VitaUI Dashboard 모듈 entry.
 * cli.ts 의 dashboard 명령이 이 파일의 buildDashboard 를 호출.
 */

export { renderDashboard } from "./builder/render";
export type { RenderOptions } from "./builder/render";
export type {
  DashboardData,
  CodeTabData,
  FigmaTabData,
  LighthouseTabData,
  SummaryTabData,
  LighthouseSummaryFile,
} from "./transformers/types";
