import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatSeconds',
  standalone: true
})
export class FormatSecondsPipe implements PipeTransform {

  transform(value: number | string): string {
    const totalSeconds = Number(value);
    if (isNaN(totalSeconds) || totalSeconds <= 0) {
      return '0 ثانية';
    }

    // تعريف المعاملات الزمنية بالثواني
    const ONE_MONTH = 30 * 24 * 3600;
    const ONE_DAY = 24 * 3600;
    const ONE_HOUR = 3600;
    const ONE_MINUTE = 60;

    // 1. التقريب لأقرب شهر
    if (totalSeconds >= ONE_MONTH) {
      const months = totalSeconds / ONE_MONTH;
      return `${months.toFixed(2)} ${months >= 3 && months <= 10 ? 'أشهر' : 'شهر'}`;
    }

    // 2. التقريب لأقرب يوم
    if (totalSeconds >= ONE_DAY) {
      const days = totalSeconds / ONE_DAY;
      return `${days.toFixed(2)} ${days >= 3 && days <= 10 ? 'أيام' : 'يوم'}`;
    }

    // 3. التقريب لأقرب ساعة
    if (totalSeconds >= ONE_HOUR) {
      const hours = totalSeconds / ONE_HOUR;
      return `${hours.toFixed(2)} ${hours >= 3 && hours <= 10 ? 'ساعات' : 'ساعة'}`;
    }

    // 4. التقريب لأقرب دقيقة
    if (totalSeconds >= ONE_MINUTE) {
      const minutes = totalSeconds / ONE_MINUTE;
      return `${minutes.toFixed(2)} ${minutes >= 3 && minutes <= 10 ? 'دقائق' : 'دقيقة'}`;
    }

    // 5. إذا كانت أقل من دقيقة تظهر بالثواني
    const seconds = totalSeconds;
    return `${seconds.toFixed(2)} ${seconds >= 3 && seconds <= 10 ? 'ثوانٍ' : 'ثانية'}`;
  }

}
