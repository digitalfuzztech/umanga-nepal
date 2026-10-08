import "@tanstack/react-start/server-only";
import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(191)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const idSchema = z.string().uuid();
export const sortOrderSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  }
  return value;
}, z.number().int().min(-2_147_483_648).max(2_147_483_647).nullable());

export const calendarDateSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    if (
      year === undefined ||
      month === undefined ||
      day === undefined ||
      year < 1000 ||
      month < 1 ||
      month > 12
    )
      return false;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day >= 1 && day <= days[month - 1]!;
  });

export function isDuplicate(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: unknown;
    errno?: unknown;
    cause?: unknown;
  };
  return (
    candidate.code === "ER_DUP_ENTRY" ||
    candidate.errno === 1062 ||
    (candidate.cause !== undefined && isDuplicate(candidate.cause))
  );
}

// Match the public header's Nepal calendar-day eligibility, without timezone shifts.
export function getKathmanduDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: "year" | "month" | "day") =>
    parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
