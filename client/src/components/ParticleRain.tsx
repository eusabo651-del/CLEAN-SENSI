import { useEffect, useRef } from "react";

type Fragment = {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
};

/** Camada decorativa de partículas azuis, independente de imagens ou retratos. */
export default function ParticleRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let previousFrame = 0;
    let fragments: Fragment[] = [];
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const draw = (now: number) => {
      const delta = previousFrame ? Math.min(0.05, (now - previousFrame) / 1000) : 0;
      previousFrame = now;
      context.clearRect(0, 0, width, height);

      for (const fragment of fragments) {
        if (!reducedMotion) {
          fragment.y += fragment.speed * delta;
          fragment.x += Math.sin(now * 0.00065 + fragment.phase) * fragment.sway * delta;
          fragment.rotation += fragment.rotationSpeed * delta;
          if (fragment.y > height + fragment.size) {
            fragment.y = -fragment.size;
            fragment.x = Math.random() * width;
          }
        }

        context.save();
        context.globalAlpha = fragment.opacity;
        context.translate(fragment.x, fragment.y);
        context.rotate(fragment.rotation);
        context.fillStyle = "#70b7ff";
        context.fillRect(-fragment.size / 2, -fragment.size / 2, fragment.size, fragment.size);
        context.restore();
      }

      context.globalAlpha = 1;
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const setup = () => {
      cancelAnimationFrame(frame);
      width = window.innerWidth;
      height = window.innerHeight;
      if (width < 2 || height < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(115, Math.max(48, Math.round((width * height) / 11_000)));
      fragments = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 4,
        speed: 10 + Math.random() * 24,
        sway: 2 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.45,
        opacity: 0.12 + Math.random() * 0.22,
      }));
      previousFrame = 0;
      draw(performance.now());
    };

    setup();
    window.addEventListener("resize", setup, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return <canvas ref={canvasRef} className="rd-particle-rain" aria-hidden="true" />;
}
