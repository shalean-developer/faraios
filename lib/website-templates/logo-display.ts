export type LogoShape = "square" | "circle" | "rounded" | "wide" | "tall";

export const LOGO_SHAPE_OPTIONS: { value: LogoShape; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "rounded", label: "Rounded square" },
  { value: "wide", label: "Wide rectangle" },
  { value: "tall", label: "Tall rectangle" },
];

export function resolveLogoShape(value: unknown, fallback: LogoShape = "square"): LogoShape {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  if (key === "circle" || key === "round") return "circle";
  if (key === "rounded" || key === "rounded-square") return "rounded";
  if (key === "wide" || key === "rectangle" || key === "rect" || key === "horizontal") {
    return "wide";
  }
  if (key === "tall" || key === "portrait" || key === "vertical") return "tall";
  if (key === "square") return "square";
  return fallback;
}

export function resolveLogoSizePx(value: unknown, fallback = 40): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(120, Math.max(20, Math.round(value)));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(120, Math.max(20, Math.round(parsed)));
    }
  }
  return fallback;
}

export function defaultLogoWidthForShape(shape: LogoShape, height: number): number {
  if (shape === "wide") return Math.min(280, Math.max(height, Math.round(height * 2.2)));
  if (shape === "tall") return Math.max(24, Math.min(height, Math.round(height * 0.72)));
  return height;
}

export function resolveLogoWidthPx(
  value: unknown,
  height: number,
  shape: LogoShape,
  fallback?: number
): number {
  const defaultWidth = fallback ?? defaultLogoWidthForShape(shape, height);

  if (shape !== "wide" && shape !== "tall") {
    return height;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = Math.round(value);
    if (shape === "wide") {
      return Math.min(280, Math.max(height, parsed));
    }
    return Math.max(24, Math.min(height, parsed));
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      if (shape === "wide") {
        return Math.min(280, Math.max(height, Math.round(parsed)));
      }
      return Math.max(24, Math.min(height, Math.round(parsed)));
    }
  }

  return defaultWidth;
}

export type LogoDisplay = {
  widthPx: number;
  heightPx: number;
  roundedClassName: string;
};

export function resolveLogoDisplay(
  shapeValue: unknown,
  sizeValue: unknown,
  widthValue?: unknown
): LogoDisplay {
  const shape = resolveLogoShape(shapeValue);
  const heightPx = resolveLogoSizePx(sizeValue);
  const widthPx = resolveLogoWidthPx(widthValue, heightPx, shape);

  const roundedClassName =
    shape === "circle"
      ? "rounded-full"
      : shape === "rounded"
        ? "rounded-2xl"
        : "rounded-lg";

  return { widthPx, heightPx, roundedClassName };
}

export function logoShapeUsesCustomWidth(shape: LogoShape): boolean {
  return shape === "wide" || shape === "tall";
}
