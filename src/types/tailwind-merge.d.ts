// Type declarations for tailwind-merge
declare module 'tailwind-merge' {
  import { ClassValue } from 'clsx';

  export function twMerge(...inputs: ClassValue[]): string;
  export function twJoin(...inputs: ClassValue[]): string;
}
