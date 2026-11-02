import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { ensureWeekShift } from '../../db/shifts';
import { loadRhythm } from '../rhythm/loadRhythm';
import { ShiftCard } from '../rhythm/ShiftCard';

/** On Today: this week's 1% shift, only while it's waiting for you to accept or skip it. */
export function TodayShift() {
  useEffect(() => {
    void ensureWeekShift();
  }, []);
  const data = useLiveQuery(() => loadRhythm());
  if (!data?.shift || data.shift.status !== 'offered') return null;
  return <ShiftCard shift={data.shift} profile={data.profile} activity={data.activity} today={data.today} />;
}
