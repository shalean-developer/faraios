"use client";

import { useEffect, useRef, useState } from "react";

const PREVIEW_VIEWPORT_WIDTH = 1280;
const PREVIEW_VIEWPORT_HEIGHT = 900;

type Props = {
  src: string;
  refreshKey: number;
};

export function WebsitePreviewFrame({ src, refreshKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateScale = () => {
      const width = node.clientWidth;
      if (width <= 0) return;
      setScale(width / PREVIEW_VIEWPORT_WIDTH);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const frameHeight = PREVIEW_VIEWPORT_HEIGHT * scale;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden bg-slate-100"
      style={{ height: frameHeight }}
    >
      <iframe
        key={refreshKey}
        src={src}
        title="Website preview"
        width={PREVIEW_VIEWPORT_WIDTH}
        height={PREVIEW_VIEWPORT_HEIGHT}
        className="border-0 bg-white"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
