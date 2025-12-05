// src/MockedData/MockedData.ts
export type MeetingRoom = {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    host: string;
    attendees: string[];
    description: string;
    location: string;
  };
  
  export const HOURS = ['9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM'];
  
  export function calculateEndTime(startTime: string, duration: number): string {
    const startIndex = HOURS.indexOf(startTime);
    const endIndex = Math.min(startIndex + duration - 1, HOURS.length - 1);
    return HOURS[endIndex];
  }  