import dayjs, { type Dayjs } from 'dayjs';

export default dayjs;

export function toIsoString(value?: string | Date | Dayjs): string {
  return (value ? dayjs(value) : dayjs()).toISOString();
}
