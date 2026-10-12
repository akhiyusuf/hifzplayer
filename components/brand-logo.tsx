import { APP_NAME } from "@/lib/brand";

type Variant = "mark" | "lockup";

type Props = {
  variant?: Variant;
  /** Intrinsic / default display height in px. Override with CSS on className. */
  height?: number;
  className?: string;
  /** Decorative when adjacent text already names Diras. */
  decorative?: boolean;
};

/** Mark is square (1:1). Lockup is ~4.087:1 (viewBox 408.703 × 100). */
function sizeFor(variant: Variant, height: number) {
  if (variant === "mark") return { width: height, height };
  return { width: Math.round(height * 4.087), height };
}

/**
 * Real Diras logo files from /public/brand.
 * Light UI → *-dark.svg; dark UI → *-light.svg (D3 geometry).
 * Swaps via [data-theme=dark] so the correct file shows before hydration.
 */
export function BrandLogo({
  variant = "lockup",
  height = 32,
  className,
  decorative = false,
}: Props) {
  const { width, height: h } = sizeFor(variant, height);
  const lightSrc = variant === "mark" ? "/brand/mark-dark.svg" : "/brand/lockup-dark.svg";
  const darkSrc = variant === "mark" ? "/brand/mark-light.svg" : "/brand/lockup-light.svg";
  const alt = decorative ? "" : APP_NAME;
  const wrapClass = ["brand-logo", className].filter(Boolean).join(" ");

  return (
    <span
      className={wrapClass}
      style={{ ["--brand-h" as string]: `${h}px`, ["--brand-w" as string]: `${width}px` }}
      aria-hidden={decorative || undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="brand-logo-light"
        src={lightSrc}
        alt={alt}
        width={width}
        height={h}
        draggable={false}
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="brand-logo-dark"
        src={darkSrc}
        alt=""
        width={width}
        height={h}
        draggable={false}
        decoding="async"
        aria-hidden="true"
      />
    </span>
  );
}
