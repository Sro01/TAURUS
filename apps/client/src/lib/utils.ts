import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind 클래스 합치기 (shadcn 부품 공용) */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
