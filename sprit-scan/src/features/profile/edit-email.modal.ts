import { Component, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { ModalComponent } from '../../shared/modal/modal-component';

@Component({
  selector: 'edit-email-modal',
  imports: [ButtonComponent, InputEmailComponent, InputPasswordComponent, ModalComponent],
  templateUrl: './edit-email-modal.html',
})
export class EditEmailModal {
  toggleModal = input(false);
  toggleModalChange = output<boolean>();

  email = signal('');
  password = signal('');

  onPasswordChange = (newPassword: string) => {
    this.password.set(newPassword);
  };

  onEmailChange = (newEmail: string) => {
    this.email.set(newEmail);
  };

  onSaveEmail(): void {
    console.log('Save Email clicked');
    this.toggleModalChange.emit(false);
  }
}
