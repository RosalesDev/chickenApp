import { Directive, Input } from '@angular/core';
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export function pluCodeValidator(nameRe: RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const invalidCode = nameRe.test(control.value);
    return invalidCode ? { invalidCode: { value: control.value } } : null;
  };
}

@Directive({
  selector: '[appPluCodeValidator]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: PluCodeValidatorDirective,
      multi: true,
    },
  ],
  standalone: false,
})
class PluCodeValidatorDirective {
  @Input('appPluCodeValidator') pluInvalidCode = '';
  validate(control: AbstractControl): ValidationErrors | null {
    return this.pluInvalidCode
      ? pluCodeValidator(new RegExp(this.pluInvalidCode, 'i'))(control)
      : null;
  }
}
