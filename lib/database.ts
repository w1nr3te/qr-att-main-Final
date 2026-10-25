import { supabase } from './supabase';

export type AttendanceStatus = 'early' | 'on_time' | 'late';

export type AttendanceRecord = {
  id: string;
  eventTitle: string;
  eventCode: string;
  status: AttendanceStatus;
  scannedAt: string;
};

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
  status?: AttendanceStatus;
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  early: 'Early',
  on_time: 'On time',
  late: 'Late',
};

export async function createEvent(event: Event): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  // new Date() reads the local time from the QR/form and converts it to UTC,
  // so the times stay correct for your timezone.
  const { error } = await supabase.from('events').insert({
    event_code: event.eventId,
    title: event.title,
    start_time: new Date(event.start).toISOString(),
    end_time: new Date(event.end).toISOString(),
    created_by: user?.id,
  });

  if (error) throw error;
}

export async function registerAttendance(rawPayload: string): Promise<RegisterResult> {
  let payload: { v?: number; event?: string };
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return { success: false, message: 'Invalid QR code.' };
  }

  if (payload.v !== 1 || !payload.event) {
    return { success: false, message: 'Not an attendance QR code.' };
  }

  const { data, error } = await supabase.rpc('record_attendance', {
    p_event_code: payload.event,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  const result = data as { title: string; status: AttendanceStatus };
  return {
    success: true,
    message: `Recorded as ${STATUS_LABEL[result.status]}.`,
    eventTitle: result.title,
    status: result.status,
  };
}

export async function getAttendanceHistory(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, status, scanned_at, events ( title, event_code )')
    .order('scanned_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    status: row.status,
    scannedAt: row.scanned_at,
    eventTitle: row.events?.title ?? 'Unknown event',
    eventCode: row.events?.event_code ?? '',
  }));
}

export type Summary = {
  events_started: number;
  attended: number;
  absent: number;
  excused: number;
  early: number;
  on_time: number;
  late: number;
  rate: number | null;
};

export async function getMySummary(): Promise<Summary> {
  const { data, error } = await supabase.rpc('get_my_summary');
  if (error) throw error;
  return data as Summary;
}