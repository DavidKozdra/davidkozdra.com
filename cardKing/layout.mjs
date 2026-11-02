import { ELEMENT_FONTS } from './project.mjs';

export function layoutDeclarations(style = {}) {
  const css = [];
  if (style.x !== undefined || style.y !== undefined) css.push(`translate:${style.x || 0}cqw ${style.y || 0}cqw`);
  if (style.width !== undefined) css.push(`width:${style.width}cqw`, 'max-width:none');
  if (style.height !== undefined) css.push(`height:${style.height}cqw`);
  if (style.rotation !== undefined) css.push(`rotate:${style.rotation}deg`);
  if (style.fontSize !== undefined) css.push(`--ck-size:clamp(8px,${style.fontSize / 6}cqw,${style.fontSize}px)`, 'font-size:var(--ck-size)');
  if (style.lineHeight !== undefined) css.push(`line-height:${style.lineHeight}`);
  if (style.letterSpacing !== undefined) css.push(`letter-spacing:${style.letterSpacing}px`);
  if (style.radius !== undefined) css.push(`border-radius:${style.radius}px`, 'overflow:hidden');
  if (style.opacity !== undefined) css.push(`opacity:${style.opacity / 100}`);
  if (style.z !== undefined) css.push(`z-index:${style.z}`);
  if (style.padding !== undefined) css.push(`padding:${style.padding}px`);
  if (style.color) css.push(`--ck-color:${style.color}`, 'color:var(--ck-color)');
  if (style.background) css.push(`--ck-background:${style.background}`, 'background:var(--ck-background)');
  if (style.font) css.push(`font-family:${style.font === 'inherit' ? 'inherit' : `'${ELEMENT_FONTS[style.font]}'`}`);
  if (style.align) css.push(`text-align:${style.align}`);
  if (style.bold !== undefined) css.push(`font-weight:${style.bold ? '700' : '400'}`);
  if (style.italic !== undefined) css.push(`font-style:${style.italic ? 'italic' : 'normal'}`);
  if (style.hidden) css.push('display:none');
  if (style.shadow) css.push('box-shadow:0 8px 24px #00000025');
  if (style.animation && style.animation !== 'none') css.push(`animation:ck-${style.animation} ${style.animation === 'reveal' ? '.8s both' : '3s ease-in-out infinite'}`);
  return css.join(';');
}
export function projectLayoutCSS(project) {
  return Object.entries(project.layouts).map(([id, style]) => `[data-ck-id="${id}"]{${layoutDeclarations(style)}}`).join('\n');
}
