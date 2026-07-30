import { Component, EventEmitter, Input, NgModule, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-password',
  templateUrl: './input-password-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class InputPasswordComponent {
  @Input() password: string = '';
  @Input() placeholder: string = 'Enter your password';
  @Output() passwordChange = new EventEmitter<string>();
  @Output() passwordValidityChange = new EventEmitter<boolean>();
  passwordVisible = signal(false);

  onPasswordChange(newPassword: string): void {
    this.password = newPassword;
    this.passwordChange.emit(this.password);
  }
  checkPasswordValidity(): boolean {
    // Mind. 8 Zeichen, je ein Buchstabe, eine Ziffer und ein Sonderzeichen
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]{8,}$/;
    return passwordRegex.test(this.password);
  }

  get placeholderText(): string {
    return this.placeholder || 'Enter your password';
  }

  togglePasswordVisibility(): boolean {
    this.passwordVisible.set(!this.passwordVisible());
    this.passwordValidityChange.emit(this.checkPasswordValidity());
    return this.passwordVisible();
  }
}
