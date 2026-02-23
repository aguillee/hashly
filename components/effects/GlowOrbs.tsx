"use client";

export function GlowOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Main teal orb - top right */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full animate-orb"
        style={{
          background: "radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, rgba(20, 184, 166, 0.05) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Cyan orb - bottom left */}
      <div
        className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full animate-orb-2"
        style={{
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.04) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Coral accent orb - center */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full animate-orb"
        style={{
          background: "radial-gradient(circle, rgba(235, 78, 96, 0.08) 0%, transparent 60%)",
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}
