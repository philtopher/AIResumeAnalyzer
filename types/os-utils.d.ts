declare module 'os-utils' {
  export function cpuUsage(callback: (value: number) => void): void;
  export function cpuFree(callback: (value: number) => void): void;
  export function platform(): string;
  export function cpuCount(): number;
  export function sysUptime(): number;
  export function freemem(): number;
  export function totalmem(): number;
  export function freememPercentage(): number;
  export function loadavg(time: number): number;
  export function harddrive(callback: (total: number, free: number, used: number) => void): void;
}
