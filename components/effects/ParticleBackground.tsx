"use client";

import * as React from "react";

// 3D point on sphere surface
interface SphereNode {
  // Spherical coordinates (fixed on sphere)
  theta: number; // polar angle (0 to PI)
  phi: number; // azimuthal angle (0 to 2PI)
  // Projected 2D coordinates (recalculated each frame)
  x: number;
  y: number;
  z: number; // depth for opacity/size
  screenX: number;
  screenY: number;
  size: number;
  baseSize: number;
}

// Gossip pulse traveling along a connection
interface GossipPulse {
  fromIdx: number;
  toIdx: number;
  progress: number; // 0 to 1
  speed: number;
  opacity: number;
}

// Ambient floating particle
interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  maxOpacity: number;
  pulse: number;
  pulseSpeed: number;
}

export function ParticleBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rafRef = React.useRef<number>(0);
  const isDarkRef = React.useRef(false);
  const mouseRef = React.useRef({ x: -1000, y: -1000 });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // --- Dynamic globe state (recalculated on resize) ---
    let isMobile = width < 768;
    let nodeCount = isMobile ? 80 : 180;
    let baseRadius = 0;
    let centerX = 0;
    let centerY = 0;
    let nodes: SphereNode[] = [];
    let connections: [number, number][] = [];
    const connectionDistance = 0.85;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    function buildGlobe() {
      isMobile = width < 768;
      nodeCount = isMobile ? 100 : 220;

      // Globe — 40% bigger than original
      baseRadius = isMobile
        ? Math.min(width, height) * 0.576
        : Math.min(width, height) * 0.547;

      // Position: right side on desktop, centered on mobile
      centerX = isMobile ? width * 0.5 : width * 0.72;
      centerY = height * 0.65;

      // Generate nodes on sphere using fibonacci sphere distribution
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        const theta = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
        const phi = (2 * Math.PI * i) / goldenRatio;

        nodes.push({
          theta,
          phi,
          x: 0,
          y: 0,
          z: 0,
          screenX: 0,
          screenY: 0,
          size: 0,
          baseSize: isMobile ? Math.random() * 0.8 + 1.2 : Math.random() * 1 + 1.4,
        });
      }

      // Pre-calculate connections (edges between nearby nodes on the sphere)
      connections = [];
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const cosAngle =
            Math.sin(nodes[i].theta) * Math.sin(nodes[j].theta) *
            Math.cos(nodes[i].phi - nodes[j].phi) +
            Math.cos(nodes[i].theta) * Math.cos(nodes[j].theta);
          const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

          if (angle < connectionDistance) {
            connections.push([i, j]);
          }
        }
      }
    }

    // Ambient particles floating across screen
    let ambientParticles: AmbientParticle[] = [];
    const ambientCount = () => isMobile ? 120 : 300;

    function buildAmbient() {
      ambientParticles = [];
      const count = ambientCount();
      for (let i = 0; i < count; i++) {
        ambientParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2.0 + 0.5,
          opacity: 0,
          maxOpacity: Math.random() * 0.35 + 0.1,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.025 + 0.01,
        });
      }
    }

    // Gossip pulses (declared before resize so it's available)
    const pulses: GossipPulse[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      buildGlobe();
      buildAmbient();
      // Re-seed pulses after rebuild
      pulses.length = 0;
      for (let i = 0; i < (isMobile ? 10 : 20); i++) {
        if (connections.length > 0) {
          const connIdx = Math.floor(Math.random() * connections.length);
          const [from, to] = connections[connIdx];
          pulses.push({
            fromIdx: from,
            toIdx: to,
            progress: Math.random(),
            speed: Math.random() * 0.015 + 0.008,
            opacity: 0.6,
          });
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);

    // Detect dark mode
    const checkDarkMode = () => {
      isDarkRef.current = document.documentElement.classList.contains("dark");
    };
    checkDarkMode();

    const observer = new MutationObserver(() => checkDarkMode());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    // Also handle touch for mobile
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("touchmove", handleTouch, { passive: true });
    let frame = 0;

    // Rotation state
    let rotationY = 0;
    const autoRotationSpeed = 0.0015;
    const tiltX = 0.25;

    // Mouse-driven rotation offset
    let mouseRotationY = 0;
    let mouseRotationX = 0;

    function project(theta: number, phi: number, rotY: number, rotX: number): [number, number, number] {
      let x = baseRadius * Math.sin(theta) * Math.cos(phi);
      let y = baseRadius * Math.cos(theta);
      let z = baseRadius * Math.sin(theta) * Math.sin(phi);

      // Rotate around Y axis
      const cosRY = Math.cos(rotY);
      const sinRY = Math.sin(rotY);
      const nx = x * cosRY - z * sinRY;
      const nz = x * sinRY + z * cosRY;
      x = nx;
      z = nz;

      // Rotate around X axis (tilt)
      const cosRX = Math.cos(rotX);
      const sinRX = Math.sin(rotX);
      const ny = y * cosRX - z * sinRX;
      const nz2 = y * sinRX + z * cosRX;
      y = ny;
      z = nz2;

      return [x, y, z];
    }

    function spawnPulse() {
      if (connections.length === 0) return;
      const connIdx = Math.floor(Math.random() * connections.length);
      const [from, to] = connections[connIdx];
      const reverse = Math.random() < 0.5;
      pulses.push({
        fromIdx: reverse ? to : from,
        toIdx: reverse ? from : to,
        progress: 0,
        speed: Math.random() * 0.015 + 0.008,
        opacity: 0,
      });
    }

    // Initial pulses
    for (let i = 0; i < (isMobile ? 10 : 20); i++) {
      if (connections.length > 0) {
        const connIdx = Math.floor(Math.random() * connections.length);
        const [from, to] = connections[connIdx];
        pulses.push({
          fromIdx: from,
          toIdx: to,
          progress: Math.random(),
          speed: Math.random() * 0.015 + 0.008,
          opacity: 0.6,
        });
      }
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      frame++;

      const dark = isDarkRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const pulseSpawnRate = isMobile ? 12 : 6;

      // Smooth mouse influence on rotation
      const targetMouseRotY = ((mx - centerX) / width) * 0.3;
      const targetMouseRotX = ((my - centerY) / height) * 0.15;
      mouseRotationY += (targetMouseRotY - mouseRotationY) * 0.03;
      mouseRotationX += (targetMouseRotX - mouseRotationX) * 0.03;

      // Auto rotate
      rotationY += autoRotationSpeed;
      const totalRotY = rotationY + mouseRotationY;
      const totalRotX = tiltX + mouseRotationX;

      // Colors
      const nodeColorRGB = dark ? "45, 212, 191" : "15, 118, 110";
      const lineColorRGB = dark ? "45, 212, 191" : "20, 130, 120";
      const pulseColorRGB = dark ? "6, 228, 250" : "14, 165, 180";
      const glowColorRGB = dark ? "45, 212, 191" : "20, 184, 166";

      // Update node positions
      for (const node of nodes) {
        const [x, y, z] = project(node.theta, node.phi, totalRotY, totalRotX);
        node.x = x;
        node.y = y;
        node.z = z;
        node.screenX = centerX + x;
        node.screenY = centerY + y;
        const depthFactor = (z + baseRadius) / (2 * baseRadius);
        node.size = node.baseSize * (0.4 + depthFactor * 0.8);
      }

      // Draw connections (back ones first for depth sorting)
      const sortedConnections = [...connections].sort((a, b) => {
        const zA = (nodes[a[0]].z + nodes[a[1]].z) / 2;
        const zB = (nodes[b[0]].z + nodes[b[1]].z) / 2;
        return zA - zB;
      });

      for (const [i, j] of sortedConnections) {
        const a = nodes[i];
        const b = nodes[j];

        const avgZ = (a.z + b.z) / 2;
        const depthFactor = (avgZ + baseRadius) / (2 * baseRadius);

        if (depthFactor < 0.15) continue;

        const baseOp = dark ? 0.10 : 0.08;
        let lineOp = baseOp * depthFactor;

        // Mouse proximity boost
        const midSX = (a.screenX + b.screenX) / 2;
        const midSY = (a.screenY + b.screenY) / 2;
        const mDist = Math.sqrt((midSX - mx) ** 2 + (midSY - my) ** 2);
        if (mDist < 200) {
          lineOp += (1 - mDist / 200) * 0.15 * depthFactor;
        }

        ctx.beginPath();
        ctx.moveTo(a.screenX, a.screenY);
        ctx.lineTo(b.screenX, b.screenY);
        ctx.strokeStyle = `rgba(${lineColorRGB}, ${lineOp})`;
        ctx.lineWidth = 0.4 + depthFactor * 0.4;
        ctx.stroke();
      }

      // Draw gossip pulses
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p];
        // Guard against invalid indices after resize
        if (pulse.fromIdx >= nodes.length || pulse.toIdx >= nodes.length) {
          pulses.splice(p, 1);
          continue;
        }
        pulse.progress += pulse.speed;

        if (pulse.progress < 0.15) {
          pulse.opacity = (pulse.progress / 0.15) * 0.9;
        } else if (pulse.progress > 0.75) {
          pulse.opacity = ((1 - pulse.progress) / 0.25) * 0.9;
        } else {
          pulse.opacity = Math.min(pulse.opacity + 0.05, 0.9);
        }

        if (pulse.progress >= 1) {
          pulses.splice(p, 1);
          continue;
        }

        const from = nodes[pulse.fromIdx];
        const to = nodes[pulse.toIdx];
        const t = pulse.progress;
        const px = from.screenX + (to.screenX - from.screenX) * t;
        const py = from.screenY + (to.screenY - from.screenY) * t;
        const pz = from.z + (to.z - from.z) * t;

        const depthFactor = (pz + baseRadius) / (2 * baseRadius);
        if (depthFactor < 0.15) continue;

        const pulseSize = 0.8 + depthFactor * 1.5;
        const finalOp = pulse.opacity * depthFactor * 0.8;

        // Glow
        ctx.beginPath();
        ctx.arc(px, py, pulseSize + 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pulseColorRGB}, ${finalOp * 0.15})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pulseColorRGB}, ${finalOp})`;
        ctx.fill();
      }

      // Draw nodes (sort by z for proper depth ordering)
      const sortedNodes = [...nodes].sort((a, b) => a.z - b.z);

      for (const node of sortedNodes) {
        const depthFactor = (node.z + baseRadius) / (2 * baseRadius);
        if (depthFactor < 0.08) continue;

        const baseOp = dark ? 0.65 : 0.5;
        let nodeOp = baseOp * depthFactor;

        // Mouse proximity glow
        const dx = node.screenX - mx;
        const dy = node.screenY - my;
        const mDist = Math.sqrt(dx * dx + dy * dy);
        let mouseGlow = 0;
        if (mDist < 150) {
          mouseGlow = (1 - mDist / 150) * 0.4 * depthFactor;
          nodeOp = Math.min(nodeOp + mouseGlow, 1);
        }

        // Outer glow ring near mouse
        if (mouseGlow > 0.05) {
          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, node.size + 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${glowColorRGB}, ${mouseGlow * 0.25})`;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, node.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nodeColorRGB}, ${nodeOp})`;
        ctx.fill();

        // Bright core for front-facing nodes
        if (depthFactor > 0.5) {
          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, node.size * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${nodeColorRGB}, ${Math.min(nodeOp * 1.5, 1)})`;
          ctx.fill();
        }
      }

      // Draw ambient particles
      const ambientColorRGB = dark ? "45, 212, 191" : "15, 118, 110";
      for (const p of ambientParticles) {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Pulse opacity
        p.pulse += p.pulseSpeed;
        p.opacity = p.maxOpacity * (0.5 + 0.5 * Math.sin(p.pulse));

        // Mouse proximity boost
        const dx = p.x - mx;
        const dy = p.y - my;
        const mDist = Math.sqrt(dx * dx + dy * dy);
        let finalOp = p.opacity;
        if (mDist < 180) {
          finalOp += (1 - mDist / 180) * 0.2;
        }

        // Skip very dim ones
        if (finalOp < 0.02) continue;

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ambientColorRGB}, ${finalOp * 0.3})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ambientColorRGB}, ${finalOp})`;
        ctx.fill();
      }

      // Spawn new pulses
      if (frame % pulseSpawnRate === 0) {
        spawnPulse();
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("touchmove", handleTouch);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
