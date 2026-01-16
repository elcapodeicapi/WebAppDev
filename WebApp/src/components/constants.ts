// src/components/constants.ts
export const HOURS = ['9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM'];
export const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calculateEndTime(startTime: string, duration: number): string {
  const startIndex = HOURS.indexOf(startTime);
  const endIndex = Math.min(startIndex + duration, HOURS.length - 1);
  return HOURS[endIndex];
}