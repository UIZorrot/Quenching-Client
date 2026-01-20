import dayjs ,{extend} from 'dayjs';
import Timezone from 'dayjs/plugin/timezone';
import Utc from 'dayjs/plugin/utc';

extend(Timezone);
extend(Utc);

export { dayjs };

