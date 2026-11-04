/** Server-rendered SVG chart for tunnel traffic (no client script needed). */

import type { TrafficSample } from "../cloudflared/store";
import { formatBytes, esc } from "./ui";

export interface ChartSeriesPoint {
  label: string;
  bytesIn: number;
  bytesOut: number;
  requests: number;
}

interface Bucket {
  from: string;
  to: string;
  bytesIn: number;
  bytesOut: number;
  requests: number;
}

function bucketSamples(samples: TrafficSample[], targetBuckets = 36): Bucket[] {
  if (samples.length === 0) return [];
  const size = Math.max(1, Math.ceil(samples.length / targetBuckets));
  const buckets: Bucket[] = [];
  for (let i = 0; i < samples.length; i += size) {
    const chunk = samples.slice(i, i + size);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    buckets.push({
      from: first.sampled_at,
      to: last.sampled_at,
      bytesIn: chunk.reduce((sum, s) => sum + Number(s.bytes_in || 0), 0),
      bytesOut: chunk.reduce((sum, s) => sum + Number(s.bytes_out || 0), 0),
      requests: chunk.reduce((sum, s) => sum + Number(s.requests || 0), 0),
    });
  }
  return buckets;
}

export function trafficSeriesPoints(samples: TrafficSample[], targetBuckets = 36): ChartSeriesPoint[] {
  return bucketSamples(samples, targetBuckets).map((bucket) => ({
    label: bucket.to,
    bytesIn: bucket.bytesIn,
    bytesOut: bucket.bytesOut,
    requests: bucket.requests,
  }));
}

function niceMax(value: number): number {
  if (value <= 0) return 1024;
  const target = value * 1.15;
  const power = Math.pow(1024, Math.floor(Math.log(target) / Math.log(1024)));
  const factor = target / power;
  const step = factor <= 1 ? 1 : factor <= 2 ? 2 : factor <= 5 ? 5 : 10;
  return Math.max(1024, step * power);
}

function clock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function linePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function areaPath(points: Array<{ x: number; y: number }>, baseY: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L ${last.x.toFixed(1)} ${baseY.toFixed(1)} L ${first.x.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

/** Renders ingress/egress traffic over the sampled window. */
export function renderTrafficChart(
  samples: TrafficSample[],
  options: { width?: number; height?: number } = {}
): string {
  const width = options.width || 900;
  const height = options.height || 300;
  const margin = { top: 22, right: 20, bottom: 34, left: 72 };
  const innerWidth = Math.max(120, width - margin.left - margin.right);
  const innerHeight = Math.max(80, height - margin.top - margin.bottom);

  const buckets = bucketSamples(samples);
  if (buckets.length === 0) return "";

  const maxValue = niceMax(
    Math.max(...buckets.map((bucket) => Math.max(bucket.bytesIn, bucket.bytesOut)))
  );

  const x = (index: number): number =>
    buckets.length <= 1 ? innerWidth / 2 : (index / (buckets.length - 1)) * innerWidth;
  const y = (value: number): number => innerHeight - (Math.min(value, maxValue) / maxValue) * innerHeight;

  const inPoints = buckets.map((bucket, index) => ({ x: x(index), y: y(bucket.bytesIn) }));
  const outPoints = buckets.map((bucket, index) => ({ x: x(index), y: y(bucket.bytesOut) }));

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const value = maxValue * ratio;
      const yPos = y(value);
      return `<g>
      <line x1="0" y1="${yPos.toFixed(1)}" x2="${innerWidth}" y2="${yPos.toFixed(1)}" stroke="rgba(230,237,247,0.09)" stroke-dasharray="3 4" />
      <text x="-10" y="${(yPos + 4).toFixed(1)}" text-anchor="end" fill="#8b9bb4" font-size="11">${formatBytes(value)}</text>
    </g>`;
    })
    .join("");

  const labelIndexes = Array.from(
    new Set([0, Math.floor((buckets.length - 1) / 2), buckets.length - 1].filter((index) => index >= 0))
  );
  const xLabels = labelIndexes
    .map(
      (index) =>
        `<text x="${x(index).toFixed(1)}" y="${(innerHeight + 20).toFixed(1)}" text-anchor="${
          index === 0 ? "start" : index === buckets.length - 1 ? "end" : "middle"
        }" fill="#8b9bb4" font-size="11">${esc(clock(buckets[index].to))}</text>`
    )
    .join("");

  const dots = buckets
    .map((bucket, index) => {
      if (buckets.length > 24 && index % 3 !== 0) return "";
      return `<g>
      <circle cx="${x(index).toFixed(1)}" cy="${y(bucket.bytesIn).toFixed(1)}" r="3" fill="#4da3ff"><title>${esc(clock(bucket.to))} · ingress ${formatBytes(bucket.bytesIn)} · ${bucket.requests} requests</title></circle>
      <circle cx="${x(index).toFixed(1)}" cy="${y(bucket.bytesOut).toFixed(1)}" r="3" fill="#00e676"><title>${esc(clock(bucket.to))} · egress ${formatBytes(bucket.bytesOut)}</title></circle>
    </g>`;
    })
    .join("");

  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tunnel ingress and egress traffic over time" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="ops-in-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4da3ff" stop-opacity="0.30" />
      <stop offset="100%" stop-color="#4da3ff" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="ops-out-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00e676" stop-opacity="0.26" />
      <stop offset="100%" stop-color="#00e676" stop-opacity="0" />
    </linearGradient>
  </defs>
  <g transform="translate(${margin.left}, ${margin.top})">
    ${gridLines}
    <path d="${areaPath(inPoints, innerHeight)}" fill="url(#ops-in-grad)" />
    <path d="${areaPath(outPoints, innerHeight)}" fill="url(#ops-out-grad)" />
    <path d="${linePath(inPoints)}" fill="none" stroke="#4da3ff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
    <path d="${linePath(outPoints)}" fill="none" stroke="#00e676" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
    <line x1="0" y1="${innerHeight}" x2="${innerWidth}" y2="${innerHeight}" stroke="rgba(230,237,247,0.18)" />
    ${dots}
    ${xLabels}
  </g>
</svg>
<div class="legend">
  <span><i class="swatch" style="background:#4da3ff"></i>Ingress</span>
  <span><i class="swatch" style="background:#00e676"></i>Egress</span>
  <span>${buckets.length} interval${buckets.length === 1 ? "" : "s"} · UTC</span>
</div>`;
}
