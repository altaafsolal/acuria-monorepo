import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/fr';

dayjs.extend(utc);
dayjs.locale('fr');
export default dayjs;

export function now(): Dayjs {
  return dayjs();
}

export function toIsoString(value?: string | Date | Dayjs): string {
  return (value ? dayjs(value) : dayjs()).toISOString();
}

export function currentYear(): number {
  return dayjs().year();
}
