export interface DemoItem {
  id: string;
  name: string;
  value: number;
}
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// Types for CodePulse
export interface AnalysisRequest {
  url: string;
}
export interface ChartDataPoint {
  date: string;
  velocity: number;
  author: string;
  message: string;
  additions: number;
  deletions: number;
  sha: string;
}
export type AnalysisData = ChartDataPoint[];