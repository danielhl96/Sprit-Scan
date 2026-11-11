import { Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-email',
  templateUrl: './input-email-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class InputEmailComponent {
  email = model<string>('');
  validEmailOn = input<boolean>(true);
  label = input<string>('Email');
  emailValidityChange = output<boolean>();

  checkEmailValidity(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email());
  }

  onEmailChange(newEmail: string): void {
    this.email.set(newEmail);
    this.emailValidityChange.emit(this.checkEmailValidity());
  }
}
