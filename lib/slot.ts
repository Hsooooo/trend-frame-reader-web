function kstHour(): number {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })).getHours();
}

export function currentPeriodLabel(): string {
  const h = kstHour();
  return h >= 6 && h < 18 ? "오전 피드" : "저녁 피드";
}
