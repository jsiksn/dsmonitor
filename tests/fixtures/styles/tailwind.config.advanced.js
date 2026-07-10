/** 테스트 fixture — presets + 함수형 카테고리 + fontSize tuple (0.9.0 보강 검증). */
const preset = {
  theme: {
    extend: {
      colors: {
        brand: "#ff0000",
        primary: { 500: "#000000" },
      },
    },
  },
};

module.exports = {
  presets: [preset],
  theme: {
    extend: {
      // 함수형 카테고리 — theme helper 참조.
      colors: ({ theme }) => ({
        primary: { 500: "#6c91f5" },
        surface: theme("colors.white", "#ffffff"),
      }),
      fontSize: {
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
      },
    },
  },
};
