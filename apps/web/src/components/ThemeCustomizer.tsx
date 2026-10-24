import { useTheme } from '../lib/theme';
import { ACCENT_OPTIONS, BACKGROUND_OPTIONS, FONT_OPTIONS } from '../theme/tokens';
import './ThemeCustomizer.css';

/**
 * Device-local appearance picker (accent, canvas, font).
 * Rendered on the owner's profile page — it styles this browser, not the account.
 */
export default function ThemeCustomizer() {
  const {
    accentColor,
    setAccentColor,
    backgroundColor,
    setBackgroundColor,
    fontId,
    setFontId,
  } = useTheme();

  return (
    <div className="theme-customizer">
      <p className="theme-customizer-title">Accent</p>
      <div className="theme-swatches" role="radiogroup" aria-label="Accent">
        {ACCENT_OPTIONS.map(a => (
          <button
            key={a.id}
            type="button"
            title={a.name}
            aria-label={`${a.name} accent`}
            aria-checked={accentColor.toLowerCase() === a.hex.toLowerCase()}
            role="radio"
            className={`theme-swatch${accentColor.toLowerCase() === a.hex.toLowerCase() ? ' selected' : ''}`}
            style={{ background: a.hex }}
            onClick={() => setAccentColor(a.hex)}
          />
        ))}
      </div>

      <p className="theme-customizer-title">Background</p>
      <div className="theme-swatches" role="radiogroup" aria-label="Background">
        {BACKGROUND_OPTIONS.map(b => (
          <button
            key={b.id}
            type="button"
            title={b.name}
            aria-label={`${b.name} background`}
            aria-checked={backgroundColor.toLowerCase() === b.hex.toLowerCase()}
            role="radio"
            className={`theme-swatch${backgroundColor.toLowerCase() === b.hex.toLowerCase() ? ' selected' : ''}`}
            style={{ background: b.hex }}
            onClick={() => setBackgroundColor(b.hex)}
          />
        ))}
      </div>

      <p className="theme-customizer-title">Font</p>
      <div className="theme-fonts" role="radiogroup" aria-label="Font">
        {FONT_OPTIONS.map(f => (
          <button
            key={f.id}
            type="button"
            aria-checked={fontId === f.id}
            role="radio"
            className={`theme-font${fontId === f.id ? ' selected' : ''}`}
            style={{ fontFamily: f.sans }}
            onClick={() => setFontId(f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}
