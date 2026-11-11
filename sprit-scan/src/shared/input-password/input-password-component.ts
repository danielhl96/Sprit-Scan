import { Component, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-password',
  templateUrl: './input-password-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class InputPasswordComponent {
  password = model<string>('');
  placeholder = input<string>('Enter your password');
  passwordValidOn = input<boolean>(true);
  passwordLabel = input<string>('Password');
  passwordValidityChange = output<boolean>();
  passwordVisible = signal(false);

  onPasswordChange(newPassword: string): void {
    this.password.set(newPassword);
    this.passwordValidityChange.emit(this.checkPasswordValidity());
  }
  checkPasswordValidity(): boolean {
    // Mind. 8 Zeichen, je ein Buchstabe, eine Ziffer und ein Sonderzeichen
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]{8,}$/;
    return passwordRegex.test(this.password());
  }

  get placeholderText(): string {
    return this.placeholder() || 'Enter your password';
  }

  togglePasswordVisibility(event?: MouseEvent): boolean {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.passwordVisible.set(!this.passwordVisible());
    return this.passwordVisible();
  }
}
