// @ts-nocheck
export type RendererType = 'svg' | 'canvas';
export type ChartType = 'line' | 'bar' | 'scatter' | 'bubble' | 'doughnut' | 'pie' | 'polarArea' | 'radar' | 'histogram';

export interface SeriesConfig {
  type?: ChartType;
  name?: string;
  data: unknown[];
  [option: string]: unknown;
}

export interface ChartData {
  labels?: unknown[];
  series: SeriesConfig[];
}

export interface ChartConfig {
  type: ChartType;
  renderer?: RendererType;
  data: ChartData;
  scales?: Record<string, unknown>;
  legend?: Record<string, unknown>;
  title?: Record<string, unknown>;
  subtitle?: Record<string, unknown>;
  tooltip?: Record<string, unknown>;
  animation?: boolean | Record<string, unknown>;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  aspectRatio?: number;
  resizeDelay?: number;
  devicePixelRatio?: number;
  locale?: string;
  events?: string[];
  interaction?: Record<string, unknown>;
  hover?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  colors?: Record<string, unknown>;
  decimation?: Record<string, unknown>;
  onResize?: (...args: unknown[]) => void;
  onHover?: (...args: unknown[]) => void;
  onClick?: (...args: unknown[]) => void;
}
