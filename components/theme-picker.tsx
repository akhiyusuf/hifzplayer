"use client";

import { PALETTES } from "@/lib/palettes";
import { useTheme } from "@/lib/theme";

export function ThemePicker() {
  const { palette, setPalette } = useTheme();

  return (
    <div
      className="theme-row"
      role="radiogroup"
      aria-label="Colour"
    >
      <span className="st">
        <b>Colour</b>
        <span>Orange, green, black and white, pink, or gold. Stays free.</span>
      </span>
      <div className="theme-swatches">
        {PALETTES.map((item) => {
          const on = palette === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`theme-swatch${on ? " on" : ""}`}
              role="radio"
              aria-checked={on}
              aria-label={item.name}
              style={{ background: item.swatch }}
              onClick={() => setPalette(item.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
