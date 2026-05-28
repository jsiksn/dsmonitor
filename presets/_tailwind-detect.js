"use strict";

/**
 * Tailwind utility detect helper — 4 preset 공통 (0.8.1+).
 *
 * 옛 흐름 (0.8.0 이하): 각 preset 안에 좁은 union 정규식 (예: `(?:m|p)-\d+`) 이 따로
 * 정의되어 있어 `mr-auto` / `space-y-6` / `text-xs` / `font-bold` 등 흔한 utility 가
 * detect 누락. tailwind-project 환경에서 정상 활용이 orphanClass 로 잘못 카운트되는
 * false negative 가 발생했습니다.
 *
 * 0.8.1 — Tailwind v3 / v4 utility prefix 전수 매치로 통일. 응답형 (`sm:` / `md:` /
 * `lg:` / `xl:` / `2xl:`) + 상태 (`hover:` / `focus:` / `active:` / `disabled:` /
 * `group-hover:` / `focus-within:` / `focus-visible:` / `dark:`) prefix + 음수 (`-mt-4`)
 * + arbitrary value (`text-[#fff]`) 도 함께 매치.
 *
 * 본 helper 가 export 하는 2 정규식 (PREFIX_PATTERN + LITERAL_PATTERN) 중 하나라도
 * 매치하면 Tailwind utility 로 인식.
 */

// Tailwind utility prefix 전수 — 새 prefix 추가 시점에 본 배열에만 추가.
const TAILWIND_PREFIXES = [
  // spacing
  "m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me",
  "p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe",
  "space-x", "space-y",
  "gap", "gap-x", "gap-y",
  // sizing
  "w", "h", "min-w", "min-h", "max-w", "max-h", "size",
  "basis",
  // position
  "top", "right", "bottom", "left", "start", "end",
  "inset", "inset-x", "inset-y",
  "z",
  // typography
  "text", "font", "leading", "tracking", "line-clamp", "whitespace", "break",
  "indent", "align", "decoration",
  // background
  "bg", "from", "via", "to",
  // border
  "border", "border-x", "border-y",
  "border-t", "border-r", "border-b", "border-l",
  "border-s", "border-e",
  "rounded",
  "rounded-t", "rounded-r", "rounded-b", "rounded-l",
  "rounded-s", "rounded-e",
  "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl",
  "rounded-ss", "rounded-se", "rounded-ee", "rounded-es",
  "divide", "divide-x", "divide-y",
  "outline", "outline-offset",
  "ring", "ring-offset",
  // effects
  "shadow", "opacity", "mix-blend", "bg-blend",
  // backdrop filter
  "backdrop", "backdrop-blur", "backdrop-brightness", "backdrop-contrast",
  "backdrop-grayscale", "backdrop-hue-rotate", "backdrop-invert",
  "backdrop-opacity", "backdrop-saturate", "backdrop-sepia",
  // filter
  "blur", "brightness", "contrast", "grayscale",
  "hue-rotate", "invert", "saturate", "sepia", "drop-shadow",
  // transition
  "transition", "duration", "ease", "delay", "animate",
  // transform
  "scale", "scale-x", "scale-y",
  "rotate", "rotate-x", "rotate-y",
  "translate-x", "translate-y",
  "skew-x", "skew-y",
  "origin", "transform",
  // layout / flex / grid
  "flex", "grow", "shrink", "order",
  "grid-cols", "grid-rows",
  "col", "row", "col-span", "row-span",
  "col-start", "col-end", "row-start", "row-end",
  "auto-cols", "auto-rows", "grid-flow",
  // alignment
  "items", "justify", "content", "self", "place",
  "justify-items", "justify-self",
  "place-items", "place-content", "place-self",
  "content-center", "content-start", "content-end",
  // overflow
  "overflow", "overflow-x", "overflow-y",
  "overscroll", "overscroll-x", "overscroll-y",
  // interactivity
  "cursor", "select", "pointer-events", "resize",
  "scroll", "scroll-m", "scroll-mx", "scroll-my",
  "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml",
  "scroll-p", "scroll-px", "scroll-py",
  "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl",
  "snap", "touch", "user-select",
  // SVG / fill
  "fill", "stroke",
  // tables / lists
  "table", "caption", "list",
  // object
  "object",
  // appearance / accent / caret
  "appearance", "accent", "caret",
  // misc
  "underline-offset", "will-change", "isolation",
  "aspect", "columns",
];

// 단독 literal utility — prefix-value 흐름이 아닌 단어 자체.
const TAILWIND_LITERALS = [
  // display
  "hidden", "block", "inline", "inline-block", "inline-flex", "inline-grid",
  "flex", "grid", "contents", "table", "flow-root", "list-item",
  // visibility
  "visible", "invisible", "collapse",
  // position
  "static", "fixed", "absolute", "relative", "sticky",
  // typography
  "truncate", "italic", "not-italic",
  "underline", "overline", "line-through", "no-underline",
  "uppercase", "lowercase", "capitalize", "normal-case",
  "antialiased", "subpixel-antialiased",
  // layout helpers
  "container", "isolate", "isolation-auto",
  // accessibility
  "sr-only", "not-sr-only",
  // flex/grid one-words
  "flex-row", "flex-row-reverse", "flex-col", "flex-col-reverse",
  "flex-wrap", "flex-nowrap", "flex-wrap-reverse",
  // overflow keywords (overflow-* 가 prefix 에도 있으나 단독 활용)
  "overflow-auto", "overflow-hidden", "overflow-clip", "overflow-visible", "overflow-scroll",
  // pointer
  "pointer-events-auto", "pointer-events-none",
  // text
  "text-left", "text-center", "text-right", "text-justify", "text-start", "text-end",
  // box-sizing
  "box-border", "box-content",
  // float / clear
  "float-left", "float-right", "float-none", "float-start", "float-end",
  "clear-left", "clear-right", "clear-none", "clear-both", "clear-start", "clear-end",
  // outline 단독
  "outline-none",
  // backface
  "backface-visible", "backface-hidden",
];

// 응답형 + 상태 prefix (선택). 어떤 utility 든 본 prefix 가 앞에 붙을 수 있음.
//   예: sm:hidden / md:flex / hover:bg-blue-500 / dark:bg-zinc-900 / focus-visible:ring-2
//
// arbitrary breakpoint (예: min-[800px]:flex) / arbitrary variant (예: [&>div]:p-4) 는
// 패턴 외형이 너무 자유로워 본 detect 의 범위 밖. portal-iris-web 새 baseline 안 케이스
// 추가 발견 시점에 본 라인 확장.
const VARIANT_PREFIX_RE = "(?:(?:sm|md|lg|xl|2xl|min-sm|min-md|min-lg|min-xl|min-2xl|max-sm|max-md|max-lg|max-xl|max-2xl):)?(?:(?:hover|focus|focus-within|focus-visible|active|visited|disabled|enabled|checked|indeterminate|default|required|valid|invalid|in-range|out-of-range|placeholder-shown|autofill|read-only|empty|first|last|odd|even|first-of-type|last-of-type|only-of-type|target|open|motion-safe|motion-reduce|first-letter|first-line|marker|selection|file|placeholder|before|after|backdrop|dark|portrait|landscape|print|rtl|ltr|aria-checked|aria-disabled|aria-expanded|aria-hidden|aria-pressed|aria-readonly|aria-required|aria-selected|group-hover|group-focus|peer-hover|peer-focus|peer-checked):)*";

// prefix-value 형식 매치 — `prefix` 또는 `prefix-VALUE` 형태.
//   value 부분: 영숫자 + 일부 punctuation (e.g. `0.5`, `1/2`, `[200px]`, `[#fff]`)
const PREFIX_PATTERN = new RegExp(
  "^" + VARIANT_PREFIX_RE + "-?(?:" + TAILWIND_PREFIXES.join("|") + ")(?:$|-[\\w.\\-/]+|-\\[[^\\]]+\\])"
);

// 단독 literal 매치 — variant prefix 만 선택적.
const LITERAL_PATTERN = new RegExp(
  "^" + VARIANT_PREFIX_RE + "(?:" + TAILWIND_LITERALS.join("|") + ")$"
);

module.exports = {
  TAILWIND_PREFIXES,
  TAILWIND_LITERALS,
  PREFIX_PATTERN,
  LITERAL_PATTERN,
  /** classPatterns 배열로 export — preset 의 detect.classPatterns / classPatterns 자리에 spread. */
  classPatterns: [PREFIX_PATTERN, LITERAL_PATTERN],
};
