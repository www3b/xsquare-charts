import ChartImplementation from './components/chart.js';
import type {ChartConfig, ChartData, RendererType} from './components/chart.types.js';

export interface ActiveItem { seriesIndex: number; index: number; }

export interface Chart {
  readonly host: HTMLElement;
  readonly surface: HTMLElement | SVGSVGElement;
  readonly renderer: RendererType;
  data: ChartData;
  setRenderer(type: RendererType): void;
  update(mode?: string): void;
  resize(width?: number, height?: number): void;
  clear(): this;
  stop(): this;
  reset(): void;
  render(): void;
  draw(): void;
  destroy(): void;
  toBase64Image(...args: unknown[]): string;
  toSVG(): string;
  isSeriesVisible(index: number): boolean;
  setSeriesVisibility(index: number, visible: boolean): void;
  showSeries(index: number): void;
  hideSeries(index: number): void;
  getActiveItems(): ActiveItem[];
  setActiveItems(items: ActiveItem[]): void;
}

export interface ChartConstructor {
  new(host: HTMLElement, config: ChartConfig): Chart;
  getChart(item: HTMLElement | SVGSVGElement): Chart | undefined;
}

export const Chart = ChartImplementation as unknown as ChartConstructor;
export type {
  BarSeriesConfig, BubbleSeriesConfig, CategoryScaleConfig, ChartConfig, ChartData, ChartType,
  DoughnutSeriesConfig, InteractionOptions, LayoutOptions, LegendOptions, LinearScaleConfig,
  LineSeriesConfig, PaintDescriptor, RadialScaleConfig, RadarSeriesConfig, RendererType,
  ScaleConfig, ScalesConfig, ScatterSeriesConfig, SeriesConfig, TitleOptions, TooltipOptions
} from './components/chart.types.js';
