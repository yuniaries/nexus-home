import { useEffect, useRef } from "react";

function hexToRgba(hex, alpha) {
  const value = hex?.replace("#", "") || "63f3ff";
  const normalized = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const number = Number.parseInt(normalized, 16);
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function OceanCanvas({ theme, effects }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ripples = [];
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let animationId;
    let lastTime = performance.now();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const addRipple = (x, y, force = 1) => {
      if (!effects.ripples) return;
      ripples.push({ x, y, radius: 4, life: 1, force, hue: ripples.length % 2 });
      if (ripples.length > 18) ripples.shift();
    };

    const onMove = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const onLeave = () => { pointer.active = false; };
    const onDown = (event) => {
      addRipple(event.clientX, event.clientY, 1.25);
      window.setTimeout(() => addRipple(event.clientX, event.clientY, 0.7), 90);
    };

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 16.67, 2);
      lastTime = now;
      frame += dt * (effects.motionSpeed || 1);
      context.clearRect(0, 0, width, height);

      if (effects.ocean) {
        const intensity = Number(effects.waveIntensity ?? 0.7);
        const horizon = height * 0.2;
        const lineCount = Math.max(10, Math.round(18 + intensity * 14));
        const primary = theme.primary || "#63f3ff";
        const secondary = theme.secondary || "#8b7cff";
        const waterGradient = context.createLinearGradient(0, horizon, 0, height);
        waterGradient.addColorStop(0, hexToRgba(primary, 0));
        waterGradient.addColorStop(0.55, hexToRgba(secondary, 0.025 + intensity * 0.025));
        waterGradient.addColorStop(1, hexToRgba(primary, 0.11 + intensity * 0.08));
        context.fillStyle = waterGradient;
        context.fillRect(0, horizon, width, height - horizon);

        for (let line = 0; line < lineCount; line += 1) {
          const depth = line / Math.max(lineCount - 1, 1);
          const baseY = horizon + Math.pow(depth, 1.48) * (height - horizon + 80);
          const alpha = (0.018 + depth * 0.095) * intensity;
          context.beginPath();
          for (let x = -20; x <= width + 20; x += 12) {
            const drift = frame * (0.018 + depth * 0.035);
            const waveA = Math.sin(x * (0.005 + depth * 0.008) + drift + line * 0.72) * (2 + depth * 10) * intensity;
            const waveB = Math.sin(x * 0.013 - drift * 1.7 + line * 0.31) * (1 + depth * 4) * intensity;
            let disturbance = 0;
            ripples.forEach((ripple) => {
              const dx = x - ripple.x;
              const dy = baseY - ripple.y;
              const distance = Math.hypot(dx, dy);
              const band = Math.exp(-Math.pow((distance - ripple.radius) / (18 + ripple.radius * 0.07), 2));
              disturbance += band * Math.sin(distance * 0.14 - ripple.radius * 0.11) * 20 * ripple.life * ripple.force * intensity;
            });
            if (pointer.active && effects.pointerGlow) {
              const distance = Math.hypot(x - pointer.x, baseY - pointer.y);
              disturbance += Math.exp(-distance / 170) * Math.sin(distance * 0.04 - frame * 0.05) * 3 * intensity;
            }
            const y = baseY + waveA + waveB + disturbance;
            if (x === -20) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          const lineGradient = context.createLinearGradient(0, 0, width, 0);
          lineGradient.addColorStop(0, hexToRgba(primary, alpha * 0.25));
          lineGradient.addColorStop(0.35, hexToRgba(primary, alpha));
          lineGradient.addColorStop(0.7, hexToRgba(secondary, alpha * 0.9));
          lineGradient.addColorStop(1, hexToRgba(primary, alpha * 0.1));
          context.strokeStyle = lineGradient;
          context.lineWidth = 0.65 + depth * 0.8;
          context.stroke();
        }
      }

      ripples.forEach((ripple) => {
        ripple.radius += (2.3 + ripple.force) * dt;
        ripple.life -= 0.0065 * dt;
        const color = ripple.hue ? theme.secondary : theme.primary;
        const ringGradient = context.createRadialGradient(
          ripple.x,
          ripple.y,
          Math.max(0, ripple.radius - 18),
          ripple.x,
          ripple.y,
          ripple.radius + 16,
        );
        ringGradient.addColorStop(0, hexToRgba(color, 0));
        ringGradient.addColorStop(0.52, hexToRgba(color, ripple.life * 0.1));
        ringGradient.addColorStop(0.64, hexToRgba(color, ripple.life * 0.42));
        ringGradient.addColorStop(0.78, hexToRgba(color, ripple.life * 0.08));
        ringGradient.addColorStop(1, hexToRgba(color, 0));
        context.beginPath();
        context.arc(ripple.x, ripple.y, ripple.radius + 16, 0, Math.PI * 2);
        context.fillStyle = ringGradient;
        context.fill();
      });
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        if (ripples[i].life <= 0) ripples.splice(i, 1);
      }

      if (!reduceMotion && effects.motion) animationId = requestAnimationFrame(draw);
    };

    resize();
    addRipple(width * 0.7, height * 0.45, 0.65);
    draw(performance.now());
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [theme.primary, theme.secondary, effects.ocean, effects.ripples, effects.pointerGlow, effects.motion, effects.motionSpeed, effects.waveIntensity]);

  return <canvas ref={canvasRef} className="ocean-canvas" aria-hidden="true" />;
}
