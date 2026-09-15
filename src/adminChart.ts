import * as d3 from "d3";
import type { DailyTrendItem } from "./types";

export interface ChartOptions {
  metric?: "volume" | "count";
  width?: number;
  height?: number;
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(0)}K`;
  }
  return String(Math.round(val));
}

export function renderTrendsChartSvg(
  trends: DailyTrendItem[],
  options: ChartOptions = {}
): string {
  const metric = options.metric || "volume";
  const isVolume = metric === "volume";

  const totalWidth = options.width || 840;
  const totalHeight = options.height || 360;
  const margin = { top: 52, right: 36, bottom: 48, left: 74 };

  const innerWidth = Math.max(100, totalWidth - margin.left - margin.right);
  const innerHeight = Math.max(100, totalHeight - margin.top - margin.bottom);

  // Safe fallback if trends array is empty
  const data: DailyTrendItem[] =
    trends.length > 0
      ? trends
      : [
          {
            date: new Date().toISOString().slice(0, 10),
            label: "Today",
            depositCount: 0,
            depositVolume: 0,
            approvedDepositCount: 0,
            approvedDepositVolume: 0,
            withdrawalCount: 0,
            withdrawalVolume: 0,
            approvedWithdrawalCount: 0,
            approvedWithdrawalVolume: 0,
            netVolume: 0,
            totalTransactions: 0,
          },
        ];

  // X scale using d3.scalePoint across dates
  const xScale = d3
    .scalePoint<string>()
    .domain(data.map((d) => d.date))
    .range([0, innerWidth])
    .padding(0.15);

  // Determine max value for Y scale
  const maxVal = d3.max(data, (d) => {
    if (isVolume) {
      return Math.max(d.depositVolume, d.withdrawalVolume, 1000);
    }
    return Math.max(d.depositCount, d.withdrawalCount, 5);
  }) ?? (isVolume ? 1000 : 5);

  const yScale = d3
    .scaleLinear()
    .domain([0, maxVal * 1.15])
    .range([innerHeight, 0])
    .nice();

  // D3 Area generators
  const depArea = d3
    .area<DailyTrendItem>()
    .x((d) => xScale(d.date) ?? 0)
    .y0(innerHeight)
    .y1((d) => yScale(isVolume ? d.depositVolume : d.depositCount))
    .curve(d3.curveMonotoneX);

  const wdArea = d3
    .area<DailyTrendItem>()
    .x((d) => xScale(d.date) ?? 0)
    .y0(innerHeight)
    .y1((d) => yScale(isVolume ? d.withdrawalVolume : d.withdrawalCount))
    .curve(d3.curveMonotoneX);

  // D3 Line generators
  const depLine = d3
    .line<DailyTrendItem>()
    .x((d) => xScale(d.date) ?? 0)
    .y((d) => yScale(isVolume ? d.depositVolume : d.depositCount))
    .curve(d3.curveMonotoneX);

  const wdLine = d3
    .line<DailyTrendItem>()
    .x((d) => xScale(d.date) ?? 0)
    .y((d) => yScale(isVolume ? d.withdrawalVolume : d.withdrawalCount))
    .curve(d3.curveMonotoneX);

  const depAreaPath = depArea(data) || "";
  const wdAreaPath = wdArea(data) || "";
  const depLinePath = depLine(data) || "";
  const wdLinePath = wdLine(data) || "";

  // Y-axis tick marks
  const yTicks = yScale.ticks(5);
  const yTickElements = yTicks
    .map((tick) => {
      const y = yScale(tick);
      const label = isVolume ? `LKR ${formatCurrency(tick)}` : String(tick);
      return `
      <g class="tick-y" transform="translate(0, ${y})">
        <line x1="0" x2="${innerWidth}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="3,3" />
        <text x="-12" y="4" fill="#94a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="system-ui, -apple-system, sans-serif">${label}</text>
      </g>`;
    })
    .join("\n");

  // X-axis tick marks
  const xTickElements = data
    .map((d) => {
      const x = xScale(d.date) ?? 0;
      return `
      <g class="tick-x" transform="translate(${x}, ${innerHeight})">
        <line y1="0" y2="6" stroke="rgba(255,255,255,0.2)" />
        <text y="22" fill="#94a3b8" font-size="11" font-weight="500" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${d.label}</text>
      </g>`;
    })
    .join("\n");

  // Data point dots & interactive tooltips
  const dataPoints = data
    .map((d) => {
      const x = xScale(d.date) ?? 0;
      const depY = yScale(isVolume ? d.depositVolume : d.depositCount);
      const wdY = yScale(isVolume ? d.withdrawalVolume : d.withdrawalCount);

      const depText = isVolume
        ? `LKR ${d.depositVolume.toLocaleString()} (${d.depositCount} deposits)`
        : `${d.depositCount} deposits (LKR ${d.depositVolume.toLocaleString()})`;
      const wdText = isVolume
        ? `LKR ${d.withdrawalVolume.toLocaleString()} (${d.withdrawalCount} withdrawals)`
        : `${d.withdrawalCount} withdrawals (LKR ${d.withdrawalVolume.toLocaleString()})`;

      return `
      <g class="data-point" data-date="${d.date}">
        <!-- Vertical hover bar indicator -->
        <line class="hover-guide" x1="${x}" y1="0" x2="${x}" y2="${innerHeight}" stroke="rgba(255,255,255,0.15)" stroke-dasharray="2,2" opacity="0" pointer-events="none" />
        
        <!-- Deposit dot -->
        <circle cx="${x}" cy="${depY}" r="4.5" fill="#10b981" stroke="#064e3b" stroke-width="2">
          <title>${d.label} Deposits: ${depText}</title>
        </circle>

        <!-- Withdrawal dot -->
        <circle cx="${x}" cy="${wdY}" r="4.5" fill="#f59e0b" stroke="#78350f" stroke-width="2">
          <title>${d.label} Withdrawals: ${wdText}</title>
        </circle>
      </g>`;
    })
    .join("\n");

  // Aggregate totals for the top summary badge
  const totalDep = data.reduce((sum, d) => sum + (isVolume ? d.depositVolume : d.depositCount), 0);
  const totalWd = data.reduce((sum, d) => sum + (isVolume ? d.withdrawalVolume : d.withdrawalCount), 0);
  const net = totalDep - totalWd;

  const depSummary = isVolume ? `LKR ${formatCurrency(totalDep)}` : String(totalDep);
  const wdSummary = isVolume ? `LKR ${formatCurrency(totalWd)}` : String(totalWd);
  const netSummary = isVolume
    ? `${net >= 0 ? "+" : "-"}LKR ${formatCurrency(Math.abs(net))}`
    : `${net >= 0 ? "+" : ""}${net}`;

  return `<svg id="d3-trends-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" style="overflow: visible; display: block;">
  <defs>
    <!-- Deposit Gradient -->
    <linearGradient id="d3-dep-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
    </linearGradient>

    <!-- Withdrawal Gradient -->
    <linearGradient id="d3-wd-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0" />
    </linearGradient>

    <!-- Drop Shadow Filter -->
    <filter id="d3-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Chart Header & Legend -->
  <g class="chart-header">
    <!-- Metric Label -->
    <text x="${margin.left}" y="24" fill="#f8fafc" font-size="14" font-weight="700" font-family="system-ui, -apple-system, sans-serif">
      Daily ${isVolume ? "Financial Volume (LKR)" : "Transaction Volume (Count)"}
    </text>
    <text x="${margin.left}" y="40" fill="#94a3b8" font-size="11" font-weight="400" font-family="system-ui, -apple-system, sans-serif">
      Net Cashflow: <tspan fill="${net >= 0 ? "#10b981" : "#ef4444"}" font-weight="600">${netSummary}</tspan> (${data.length} day trend)
    </text>

    <!-- Legend (Deposits) -->
    <g transform="translate(${totalWidth - margin.right - 270}, 22)">
      <circle cx="0" cy="-4" r="5" fill="#10b981" />
      <text x="12" y="0" fill="#e2e8f0" font-size="12" font-weight="600" font-family="system-ui, -apple-system, sans-serif">Deposits: <tspan fill="#10b981">${depSummary}</tspan></text>
    </g>

    <!-- Legend (Withdrawals) -->
    <g transform="translate(${totalWidth - margin.right - 120}, 22)">
      <circle cx="0" cy="-4" r="5" fill="#f59e0b" />
      <text x="12" y="0" fill="#e2e8f0" font-size="12" font-weight="600" font-family="system-ui, -apple-system, sans-serif">Withdrawals: <tspan fill="#f59e0b">${wdSummary}</tspan></text>
    </g>
  </g>

  <!-- Plot Area -->
  <g transform="translate(${margin.left}, ${margin.top})">
    <!-- Background Grid Lines -->
    <g class="grid-y">
      ${yTickElements}
    </g>

    <!-- Base zero axis -->
    <line x1="0" y1="${innerHeight}" x2="${innerWidth}" y2="${innerHeight}" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" />

    <!-- Withdrawal Area & Line -->
    <path d="${wdAreaPath}" fill="url(#d3-wd-grad)" />
    <path d="${wdLinePath}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Deposit Area & Line -->
    <path d="${depAreaPath}" fill="url(#d3-dep-grad)" />
    <path d="${depLinePath}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- X Axis Ticks & Labels -->
    <g class="axis-x">
      ${xTickElements}
    </g>

    <!-- Data Circles -->
    <g class="data-points">
      ${dataPoints}
    </g>
  </g>
</svg>`;
}
