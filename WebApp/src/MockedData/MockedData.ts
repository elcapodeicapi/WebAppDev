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
  
  const HOURS = ['9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM'];
  const NAMES = ['Alice','Bob','Charlie','David','Eve','Frank','Grace','Heidi'];
  
  function getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  function calculateEndTime(startTime: string, duration: number): string {
    const startIndex = HOURS.indexOf(startTime);
    const endIndex = Math.min(startIndex + duration - 1, HOURS.length - 1);
    return HOURS[endIndex];
  }
  
  function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  export function generateMockMeetings(): MeetingRoom[] {
    const today = new Date();
    const meetings: MeetingRoom[] = [];
  
    // 2 meetings only
    for (let i = 0; i < 2; i++) {
      const dayOffset = Math.floor(Math.random() * 7); // within this week
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
  
      const startTime = randomChoice(HOURS);
      const duration = 1;
  
      const attendeesCount = Math.floor(Math.random() * 3) + 1;
      const attendees = Array.from({ length: attendeesCount }, () => randomChoice(NAMES));
  
      meetings.push({
        id: (i + 1).toString(),
        title: `Meeting ${i + 1}`,
        date: getDateString(date),
        startTime,
        endTime: calculateEndTime(startTime, duration),
        duration,
        host: randomChoice(NAMES),
        attendees,
        description: `Description for meeting ${i + 1}`,
        location: `Room ${Math.floor(Math.random() * 5) + 1}`,
      });
    }
  
    return meetings;
  }  