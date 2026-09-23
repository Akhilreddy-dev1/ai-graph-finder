export function slopeBetweenPoints(x1, y1, x2, y2) {
  const dx = Number(x2) - Number(x1)
  if (!Number.isFinite(dx) || dx === 0) return null
  const dy = Number(y2) - Number(y1)
  return Number.isFinite(dy) ? dy / dx : null
}

export function approximateDerivative(fn, x, h = 0.000001) {
  if (typeof fn !== 'function' || !Number.isFinite(Number(x)) || h === 0) return null
  const value = (fn(Number(x) + h) - fn(Number(x))) / h
  return Number.isFinite(value) ? value : null
}
