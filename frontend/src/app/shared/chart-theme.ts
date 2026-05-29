import { Chart, ChartOptions, registerables } from 'chart.js';
import type { ThemeMode } from '../services/theme.service';

let registered = false;

export function ensureChartJs(): void {
  if (!registered) {
    Chart.register(...registerables);
    registered = true;
  }
}

export interface PharmaChartPalette {
  text: string;
  grid: string;
  border: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  stock: string;
  stockMid: string;
  stockLow: string;
  expiry: string;
  lowStock: string;
}

export function chartPalette(theme: ThemeMode): PharmaChartPalette {
  const dark = theme === 'dark';
  return {
    text: dark ? '#f8fafc' : '#003366',
    grid: dark ? 'rgba(204, 255, 0, 0.12)' : 'rgba(0, 51, 102, 0.1)',
    border: dark ? 'rgba(204, 255, 0, 0.45)' : '#003366',
    tooltipBg: dark ? '#0f172a' : '#ffffff',
    tooltipText: dark ? '#f8fafc' : '#003366',
    tooltipBorder: dark ? '#ccff00' : '#003366',
    stock: dark ? '#ccff00' : '#39ff14',
    stockMid: dark ? '#a3e635' : '#c4ff00',
    stockLow: '#ef4444',
    expiry: dark ? '#fbbf24' : '#d97706',
    lowStock: '#ef4444'
  };
}

function tooltipPlugin(palette: PharmaChartPalette) {
  return {
    backgroundColor: palette.tooltipBg,
    titleColor: palette.tooltipText,
    bodyColor: palette.tooltipText,
    footerColor: palette.tooltipText,
    borderColor: palette.tooltipBorder,
    caretSize: 6,
    cornerRadius: 2,
    borderWidth: 2,
    padding: 10,
    displayColors: true,
    boxPadding: 4
  };
}

export function stockBarColor(stock: number, palette: PharmaChartPalette): string {
  if (stock < 10) return palette.stockLow;
  if (stock < 20) return palette.stockMid;
  return palette.stock;
}

export function baseCartesianOptions(palette: PharmaChartPalette, indexAxis: 'x' | 'y' = 'y'): ChartOptions<'bar'> {
  return {
    indexAxis,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: palette.text, font: { weight: 'bold', size: 11 } }
      },
      tooltip: tooltipPlugin(palette)
    },
    scales: {
      x: {
        ticks: { color: palette.text, font: { weight: 'bold' } },
        grid: { color: palette.grid },
        border: { color: palette.border, width: 2 }
      },
      y: {
        ticks: { color: palette.text, font: { weight: 'bold' } },
        grid: { color: palette.grid },
        border: { color: palette.border, width: 2 }
      }
    }
  };
}

export function baseDoughnutOptions(palette: PharmaChartPalette): ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: palette.text, font: { weight: 'bold', size: 11 }, padding: 16 }
      },
      tooltip: tooltipPlugin(palette)
    }
  };
}
