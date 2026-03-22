import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Store amounts as integer paisa (1 BDT = 100 paisa) */
export function toPaisa(bdt: number): number {
  return Math.round(bdt * 100);
}

export function toBDT(paisa: number): number {
  return paisa / 100;
}

export function formatBDT(paisa: number): string {
  const bdt = toBDT(paisa);
  return `৳${bdt.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
