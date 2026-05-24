/**
 * Design token system — Logisolve
 * Apple liquid glass / VisionOS aesthetic
 */

export const TOKENS = {

  light: {
    background:
      "radial-gradient(ellipse 60% 50% at 15% 20%,rgba(159,224,190,0.28) 0%,transparent 55%)," +
      "radial-gradient(ellipse 50% 45% at 88% 60%,rgba(185,215,255,0.20) 0%,transparent 50%)," +
      "radial-gradient(ellipse 45% 40% at 55% 90%,rgba(220,200,255,0.14) 0%,transparent 50%)," +
      "radial-gradient(ellipse 35% 30% at 75% 10%,rgba(255,220,180,0.12) 0%,transparent 45%)," +
      "linear-gradient(160deg,#F5F4F0 0%,#E8E3DB 100%)",

    surface:          "rgba(255,255,255,0.22)",
    surfaceStrong:    "rgba(255,255,255,0.42)",
    surfaceOpaque:    "rgba(255,255,255,0.80)",

    border:           "rgba(255,255,255,0.65)",   // glass edge
    borderSubtle:     "rgba(0,0,0,0.06)",          // input / divider
    borderHi:         "rgba(0,0,0,0.10)",

    text:             "#161616",
    textSecondary:    "#6E6E73",
    textTertiary:     "#A1A1A6",
    textPlaceholder:  "#C8C8CC",

    accent:           "#BFE8D3",
    accentStrong:     "#9FE0BE",
    accentText:       "#2A9768",    // readable green for text
    glow:             "rgba(159,224,190,0.26)",

    shadow:
      "0 0 0 1px rgba(255,255,255,0.75)," +
      "0 12px 40px rgba(0,0,0,0.04)," +
      "0 2px 0 rgba(255,255,255,1) inset," +
      "0 -1px 0 rgba(255,255,255,0.20) inset",

    shadowSm:
      "0 0 0 1px rgba(255,255,255,0.70)," +
      "0 6px 20px rgba(0,0,0,0.03)," +
      "0 1.5px 0 rgba(255,255,255,1) inset",

    blur:             "blur(44px) saturate(2.8) brightness(1.02)",
  },

  dark: {
    background:
      "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(143,227,190,0.07) 0%,transparent 60%)," +
      "radial-gradient(ellipse 50% 40% at 85% 80%,rgba(143,227,190,0.04) 0%,transparent 50%)," +
      "#0D0F12",

    surface:          "rgba(22,24,28,0.62)",
    surfaceStrong:    "rgba(32,35,42,0.75)",
    surfaceOpaque:    "rgba(16,18,22,0.94)",

    border:           "rgba(255,255,255,0.07)",
    borderSubtle:     "rgba(255,255,255,0.07)",
    borderHi:         "rgba(255,255,255,0.13)",

    text:             "#F5F5F7",
    textSecondary:    "#B6BBC4",
    textTertiary:     "#7E848E",
    textPlaceholder:  "#556070",

    accent:           "#8FE3BE",
    accentStrong:     "#BFE8D3",
    accentText:       "#8FE3BE",
    glow:             "rgba(143,227,190,0.22)",

    shadow:
      "0 8px 32px rgba(0,0,0,0.44)," +
      "0 1px 0 rgba(255,255,255,0.06) inset",

    shadowSm:
      "0 4px 16px rgba(0,0,0,0.35)," +
      "0 1px 0 rgba(255,255,255,0.04) inset",

    blur:             "blur(28px) saturate(1.6)",
  },
};
