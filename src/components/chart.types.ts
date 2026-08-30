export type RendererType = 'svg' | 'canvas';
export type ChartType = 'line' | 'bar' | 'scatter' | 'bubble' | 'doughnut' | 'pie' | 'polarArea' | 'radar' | 'histogram';

export interface PaintDescriptor { type: 'linear-gradient' | 'radial-gradient' | 'pattern'; x0?: number; y0?: number; x1?: number; y1?: number; r0?: number; r1?: number; colorStops?: {offset: number; color: string}[]; image?: CanvasImageSource; }
export type FillTarget = boolean | number | string | 'origin' | 'start' | 'end' | 'stack' | 'shape' | {value: number};
export interface FillOptions { target: FillTarget; above?: string | PaintDescriptor; below?: string | PaintDescriptor; }
export interface SeriesConfig { type?: ChartType; name?: string; data: unknown[]; backgroundColor?: string | string[] | PaintDescriptor; borderColor?: string | string[] | PaintDescriptor; borderWidth?: number; borderDash?: number[]; borderRadius?: number; borderSkipped?: boolean | string; pointRadius?: number; pointStyle?: string | false | CanvasImageSource; pointRotation?: number; pointBackgroundColor?: string | PaintDescriptor; pointBorderColor?: string | PaintDescriptor; spanGaps?: boolean | number; tension?: number; stepped?: boolean | 'before' | 'after' | 'middle'; fill?: FillTarget | FillOptions; hidden?: boolean; label?: string; stack?: string; xAxisID?: string; yAxisID?: string; rAxisID?: string; parsing?: boolean | {xAxisKey?: string; yAxisKey?: string; key?: string}; }
export interface LineSeriesConfig extends SeriesConfig { type?: 'line'; tension?: number; stepped?: boolean | 'before' | 'after' | 'middle'; showLine?: boolean; }
export interface BarSeriesConfig extends SeriesConfig { type?: 'bar' | 'histogram'; barPercentage?: number; categoryPercentage?: number; borderRadius?: number; }
export interface ScatterSeriesConfig extends SeriesConfig { type?: 'scatter'; showLine?: boolean; }
export interface BubbleSeriesConfig extends SeriesConfig { type?: 'bubble'; }
export interface DoughnutSeriesConfig extends SeriesConfig { type?: 'doughnut' | 'pie' | 'polarArea'; cutout?: string | number; rotation?: number; circumference?: number; }
export interface RadarSeriesConfig extends SeriesConfig { type?: 'radar'; }
export interface ChartData { labels?: unknown[]; series: SeriesConfig[]; }

export interface CategoryScaleConfig { type?: 'category'; axis?: 'x' | 'y'; labels?: string[]; display?: boolean; position?: 'top' | 'bottom' | 'left' | 'right'; }
export interface LinearScaleConfig { type?: 'linear' | 'logarithmic' | 'time' | 'timeseries'; axis?: 'x' | 'y'; min?: number; max?: number; beginAtZero?: boolean; display?: boolean; position?: 'top' | 'bottom' | 'left' | 'right'; }
export interface RadialScaleConfig { type?: 'radialLinear'; min?: number; max?: number; beginAtZero?: boolean; display?: boolean; }
export type ScaleConfig = CategoryScaleConfig | LinearScaleConfig | RadialScaleConfig;
export type ScalesConfig = Record<string, ScaleConfig>;
export interface LegendOptions { display?: boolean; position?: 'top' | 'left' | 'bottom' | 'right' | 'chartArea'; align?: 'start' | 'center' | 'end'; rtl?: boolean; }
export interface TitleOptions { display?: boolean; text?: string | string[]; position?: 'top' | 'left' | 'bottom' | 'right'; align?: 'start' | 'center' | 'end'; color?: string; }
export interface TooltipOptions { enabled?: boolean; mode?: 'nearest' | 'index' | 'dataset' | 'point' | 'x' | 'y'; intersect?: boolean; }
export interface InteractionOptions { mode?: 'nearest' | 'index' | 'dataset' | 'point' | 'x' | 'y'; intersect?: boolean; axis?: 'x' | 'y' | 'r' | 'xy'; }
export interface LayoutOptions { padding?: number | {top?: number; right?: number; bottom?: number; left?: number}; }
export interface ColorsOptions { enabled?: boolean; forceOverride?: boolean; }
export interface DecimationOptions { enabled?: boolean; algorithm?: 'min-max' | 'lttb'; samples?: number; threshold?: number; }
export interface FillerOptions { propagate?: boolean; drawTime?: 'beforeDraw' | 'beforeDatasetsDraw' | 'beforeDatasetDraw'; }
export interface ChartConfig {
  type: ChartType; renderer?: RendererType; data: ChartData; scales?: ScalesConfig; colors?: false | ColorsOptions; decimation?: false | DecimationOptions; filler?: false | FillerOptions; legend?: false | LegendOptions; title?: false | TitleOptions; subtitle?: false | TitleOptions; tooltip?: false | TooltipOptions; animation?: boolean | {duration?: number; easing?: string}; responsive?: boolean; maintainAspectRatio?: boolean; aspectRatio?: number; resizeDelay?: number; devicePixelRatio?: number; locale?: string; events?: string[]; interaction?: InteractionOptions; hover?: InteractionOptions; layout?: LayoutOptions; indexAxis?: 'x' | 'y'; onResize?: (chart: unknown, size: {width: number; height: number}) => void; onHover?: (event: Event, active: unknown[], chart: unknown) => void; onClick?: (event: Event, active: unknown[], chart: unknown) => void;
}
