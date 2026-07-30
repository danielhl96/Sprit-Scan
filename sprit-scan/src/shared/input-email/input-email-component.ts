import { Component, EventEmitter, Input, NgModule, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-email',
  templateUrl: './input-email-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class InputEmailComponent {
  @Input() email: string = '';
  @Output() emailChange = new EventEmitter<string>();
  @Output() emailValidityChange = new EventEmitter<boolean>();

  checkEmailValidity(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(this.email);

    return isValid;
  }

  onEmailChange(newEmail: string): void {
    this.email = newEmail;
    this.emailChange.emit(this.email);
    this.emailValidityChange.emit(this.checkEmailValidity());
  }
}
