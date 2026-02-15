import { Slot } from "./types";

function kstNowParts(): { hour: number; minute: number } {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return { hour: now.getHours(), minute: now.getMinutes() };
}

export function isSlotOpen(slot: Slot): boolean {
  const { hour, minute } = kstNowParts();
  if (slot === "am") {
    return hour > 7 || (hour === 7 && minute >= 30);
  }
  return hour > 21 || (hour === 21 && minute >= 30);
}

export function defaultSlotByKstNow(): Slot {
  return isSlotOpen("pm") ? "pm" : "am";
}
