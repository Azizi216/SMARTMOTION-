// 1D signal smoothing utilities used by the exercise / walking analyzers.

/**
 * Simple moving average with window size `w`. Edges shrink the window.
 * Preserves array length. NaN values are treated as the last valid value to
 * avoid pulling the average toward zero on missing frames.
 */
export function movingAverage(arr: number[], w: number): number[] {
  if (w <= 1) return [...arr];
  const out = new Array<number>(arr.length);
  let lastValid = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (Number.isNaN(v)) {
      out[i] = lastValid;
      continue;
    }
    lastValid = v;
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - w + 1); j <= i; j++) {
      if (!Number.isNaN(arr[j])) {
        sum += arr[j];
        count++;
      }
    }
    out[i] = count > 0 ? sum / count : v;
  }
  return out;
}

/**
 * One-pole exponential smoothing. y[i] = a*x[i] + (1-a)*y[i-1].
 */
export function exponentialSmoothing(arr: number[], a: number): number[] {
  if (arr.length === 0) return [];
  const out = new Array<number>(arr.length);
  out[0] = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (Number.isNaN(arr[i])) {
      out[i] = out[i - 1];
    } else {
      out[i] = a * arr[i] + (1 - a) * out[i - 1];
    }
  }
  return out;
}

export function smooth(arr: number[], smoothing = 0.4): number[] {
  return exponentialSmoothing(arr, smoothing);
}

/**
 * Detect local maxima (peaks) with a minimum prominence and minimum distance.
 * Returns indices in `arr` that are peaks.
 */
export function findPeaks(arr: number[], options?: { minDistance?: number; minProminence?: number }): number[] {
  const minDistance = options?.minDistance ?? 1;
  const minProminence = options?.minProminence ?? 0;
  const peaks: { idx: number; value: number }[] = [];

  for (let i = 1; i < arr.length - 1; i++) {
    if (Number.isNaN(arr[i])) continue;
    if (arr[i] > arr[i - 1] && arr[i] >= arr[i + 1]) {
      peaks.push({ idx: i, value: arr[i] });
    }
  }

  // Filter by prominence
  let filtered = peaks;
  if (minProminence > 0) {
    filtered = peaks.filter((p) => p.value >= minProminence);
  }

  // Enforce minimum distance (keep highest)
  if (minDistance > 1) {
    filtered.sort((a, b) => b.value - a.value);
    const chosen: number[] = [];
    for (const p of filtered) {
      if (chosen.every((c) => Math.abs(c - p.idx) >= minDistance)) {
        chosen.push(p.idx);
      }
    }
    return chosen.sort((a, b) => a - b);
  }
  return filtered.map((p) => p.idx);
}

export function derivative(arr: number[], dt: number): number[] {
  if (arr.length < 2) return arr.map(() => 0);
  const out = new Array<number>(arr.length).fill(0);
  for (let i = 1; i < arr.length; i++) {
    out[i] = (arr[i] - arr[i - 1]) / dt;
  }
  return out;
}
