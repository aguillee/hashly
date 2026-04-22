/**
 * AmbientBackground — zero-JS atmospheric backdrop.
 *
 * Replaces the old canvas-based 3D particle globe. Just CSS layers:
 *   1. Two soft radial-gradient light sources (brand teal top-left,
 *      coral bottom-right) that give the scene depth without movement.
 *   2. A very subtle grid so empty space has some geometry to it.
 *   3. A noise/grain overlay so gradients don't band on OLED displays.
 *
 * All layers are fixed-positioned, pointer-events:none, sit at z:0
 * behind the app shell. Server component — no hydration cost.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Layer 1 — base tint */}
      <div
        className="absolute inset-0"
        style={{
          background: "var(--bg-primary)",
        }}
      />

      {/* Layer 2 — top-left teal orb */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] opacity-60 dark:opacity-45"
        style={{
          background:
            "radial-gradient(closest-side, rgba(58,204,184,0.22), rgba(58,204,184,0.06) 55%, transparent 75%)",
          filter: "blur(40px)",
        }}
      />

      {/* Layer 3 — bottom-right coral orb */}
      <div
        className="absolute -bottom-[20%] -right-[10%] w-[65vw] h-[65vw] max-w-[800px] max-h-[800px] opacity-50 dark:opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(185,133,250,0.16), rgba(185,133,250,0.04) 55%, transparent 75%)",
          filter: "blur(40px)",
        }}
      />

      {/* Layer 4 — subtle dot grid, dimmer in dark mode */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse at 50% 40%, #000 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 40%, #000 40%, transparent 75%)",
        }}
      />

      {/* Layer 5 — noise/grain to prevent banding on OLED */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }}
      />

      {/* Layer 6 — top vignette so sidebar/header content pops */}
      <div
        className="absolute inset-x-0 top-0 h-64 opacity-60 dark:opacity-80"
        style={{
          background:
            "linear-gradient(to bottom, var(--bg-primary) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
