// Polynomials are arrays of coefficients indexed by power: [c0, c1, c2, ...].
// A term is { coef, power }.

export const MINUS = '−';

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

export function multiply(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  a.forEach((ca, i) => b.forEach((cb, j) => { out[i + j] += ca * cb; }));
  return out;
}

export function evaluate(p, x) {
  return p.reduce((sum, c, power) => sum + c * x ** power, 0);
}

// Non-zero terms, highest power first.
export function termsOf(p) {
  const terms = [];
  for (let power = p.length - 1; power >= 0; power--) {
    if (p[power] !== 0) terms.push({ coef: p[power], power });
  }
  return terms;
}

export function superscript(n) {
  return [...String(n)].map((d) => SUPERSCRIPT_DIGITS[d]).join('');
}

export function xPart(power) {
  if (power === 0) return '';
  return power === 1 ? 'x' : 'x' + superscript(power);
}

// One term with its own sign: "−4x", "3x", "x²", "−12".
export function formatTerm({ coef, power }) {
  const size = Math.abs(coef);
  const digits = power > 0 && size === 1 ? '' : String(size);
  return (coef < 0 ? MINUS : '') + digits + xPart(power);
}

// Terms joined with spaced signs: "x² − x − 12".
export function formatTerms(terms) {
  return terms.map((t, i) => {
    const body = formatTerm({ coef: Math.abs(t.coef), power: t.power });
    if (i === 0) return (t.coef < 0 ? MINUS : '') + body;
    return (t.coef < 0 ? ` ${MINUS} ` : ' + ') + body;
  }).join('');
}

export function formatPoly(p) {
  return formatTerms(termsOf(p));
}
