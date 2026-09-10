import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'number' })
export class NumberPipe implements PipeTransform {
  transform(value: string | number): string {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return value.toString().replace(/\d/g, d => arabicDigits[+d]);
  }
}
