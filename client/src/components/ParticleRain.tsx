import { useEffect, useRef } from "react";

type FallingFragment = {
  sourceX: number;
  sourceY: number;
  sourceSize: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  sway: number;
  phase: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
};

/** Site-wide falling fragments sampled from the supplied CLEAN SENSI portrait. */
export default function ParticleRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const image = new Image();
    image.decoding = "async";
    image.src = "/rd-portrait.jpeg";

    let frame = 0;
    let disposed = false;
    let width = 0;
    let height = 0;
    let previousFrame = 0;
    let fragments: FallingFragment[] = [];
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const sampleSize = 160;

    const createImagePatch = (pixels: Uint8ClampedArray, sourceScale: number) => {
      for (let attempt = 0; attempt < 18; attempt++) {
        const patchPixels = 4 + Math.floor(Math.random() * 5);
        const sourceX = Math.floor(Math.random() * (sampleSize - patchPixels));
        const sourceY = Math.floor(Math.random() * (sampleSize - patchPixels));
        const centerX = sourceX + Math.floor(patchPixels / 2);
        const centerY = sourceY + Math.floor(patchPixels / 2);
        const offset = (centerY * sampleSize + centerX) * 4;
        const light = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
        if (light > 38) {
          return { sourceX: sourceX * sourceScale, sourceY: sourceY * sourceScale, sourceSize: patchPixels * sourceScale };
        }
      }
      const patchPixels = 6;
      const sourceX = Math.floor(Math.random() * (sampleSize - patchPixels));
      const sourceY = Math.floor(Math.random() * (sampleSize - patchPixels));
      return { sourceX: sourceX * sourceScale, sourceY: sourceY * sourceScale, sourceSize: patchPixels * sourceScale };
    };

    const draw = (now: number) => {
      if (disposed) return;
      const delta = previousFrame ? Math.min(0.05, (now - previousFrame) / 1000) : 0;
      previousFrame = now;
      context.clearRect(0, 0, width, height);

      for (const fragment of fragments) {
        if (!reducedMotion) {
          fragment.y += fragment.speed * delta;
          fragment.x += Math.sin(now * 0.00075 + fragment.phase) * fragment.sway * delta;
          fragment.rotation += fragment.rotationSpeed * delta;
          if (fragment.y > height + fragment.height) {
            fragment.y = -Math.random() * Math.max(90, height * 0.22) - fragment.height;
            fragment.x = Math.random() * width;
          }
          if (fragment.x < -fragment.width) fragment.x = width + fragment.width;
          if (fragment.x > width + fragment.width) fragment.x = -fragment.width;
        }

        context.save();
        context.globalAlpha = fragment.opacity;
        context.translate(fragment.x, fragment.y);
        context.rotate(fragment.rotation);
        context.drawImage(
          image,
          fragment.sourceX,
          fragment.sourceY,
          fragment.sourceSize,
          fragment.sourceSize,
          -fragment.width / 2,
          -fragment.height / 2,
          fragment.width,
          fragment.height,
        );
        context.restore();
      }

      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const setup = () => {
      if (disposed || !image.complete || !image.naturalWidth) return;
      cancelAnimationFrame(frame);
      width = window.innerWidth;
      height = window.innerHeight;
      if (width < 2 || height < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const sample = document.createElement("canvas");
      sample.width = sampleSize;
      sample.height = sampleSize;
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      if (!sampleContext) return;
      sampleContext.drawImage(image, 0, 0, sampleSize, sampleSize);
      const pixels = sampleContext.getImageData(0, 0, sampleSize, sampleSize).data;
      const sourceScale = image.naturalWidth / sampleSize;
      const count = Math.min(210, Math.max(75, Math.round((width * height) / 4500)));

      fragments = Array.from({ length: count }, () => {
        const patch = createImagePatch(pixels, sourceScale);
        const size = 3 + Math.random() * 5;
        return {
          ...patch,
          x: Math.random() * width,
          y: Math.random() * height,
          width: size * (0.72 + Math.random() * 0.58),
          height: size * (0.75 + Math.random() * 0.85),
          speed: 18 + Math.random() * 46,
          sway: 3 + Math.random() * 14,
          phase: Math.random() * Math.PI * 2,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.9,
          opacity: 0.24 + Math.random() * 0.34,
        };
      });

      previousFrame = 0;
      draw(performance.now());
    };

    image.addEventListener("load", setup);
    window.addEventListener("resize", setup, { passive: true });
    setup();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      image.removeEventListener("load", setup);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return <canvas ref={canvasRef} className="rd-particle-rain" aria-hidden="true" />;
}
