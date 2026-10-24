import { describe, it, expect } from 'vitest';
import {
  ACCENT_OPTIONS,
  BACKGROUND_OPTIONS,
  deriveAccent,
  deriveSurfaces,
  isDarkColor,
  mix,
  onColorFor,
  resolveFont,
  withAlpha,
} from '../src/theme/tokens';

describe('theme tokens (mobile parity)', () => {
  it('mixes and fades colours', () => {
    expect(withAlpha('#C9FF45', 0.5)).toBe('rgba(201, 255, 69, 0.5)');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
  });

  it('picks readable foregrounds', () => {
    expect(onColorFor('#C9FF45')).toBe('#0B0D0F');
    expect(onColorFor('#0B0D0F')).toBe('#F4F5F0');
    expect(isDarkColor('#0B0D0F')).toBe(true);
    expect(isDarkColor('#F6F7F4')).toBe(false);
  });

  it('derives accent tokens per mode', () => {
    const dark = deriveAccent('#C9FF45', true);
    expect(dark.accent).toBe('#C9FF45');
    expect(dark.primary).toBe('#C9FF45');
    const light = deriveAccent('#C9FF45', false);
    expect(light.accent).toBe('#C9FF45');
    // Light mode darkens the action colour for contrast.
    expect(light.primary).not.toBe('#C9FF45');
    expect(light.onAccent).toBe('#0B0D0F');
  });

  it('derives surfaces for custom canvases, builtins unchanged', () => {
    expect(deriveSurfaces('#0B0D0F', true).bgSecondary).toBe('#14171A');
    const navy = deriveSurfaces('#0C1826', true);
    expect(navy.bgSecondary).not.toBe('#14171A');
    expect(navy.textPrimary).not.toBe(navy.textMuted);
  });

  it('exposes mobile option sets and resolves fonts', () => {
    expect(ACCENT_OPTIONS.length).toBeGreaterThan(10);
    expect(BACKGROUND_OPTIONS.some(b => b.group === 'light')).toBe(true);
    expect(resolveFont('nope').id).toBe('system');
    expect(resolveFont('outfit').display).toContain('Outfit');
  });
});
