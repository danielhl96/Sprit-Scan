import { Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { ModalComponent } from '../../shared/modal/modal-component';

@Component({
  selector: 'edit-password-modal',
  imports: [ButtonComponent, InputEmailComponent, InputPasswordComponent, ModalComponent],
  templateUrl: './edit-password-modal.html',
})
export class EditPasswordModal {
  toggleModal = input(false);
  toggleModalChange = output<boolean>();

  email = signal('');
  newPassword = signal('');
  currentPassword = signal('');
  confirmPassword = signal('');

  onCurrentPasswordChange = (newCurrentPassword: string) => {
    this.currentPassword.set(newCurrentPassword);
  };

  onNewPasswordChange = (newPassword: string) => {
    this.newPassword.set(newPassword);
  };

  onConfirmPasswordChange = (newConfirmPassword: string) => {
    this.confirmPassword.set(newConfirmPassword);
  };

  onEmailChange = (newEmail: string) => {
    this.email.set(newEmail);
  };

  protected checkPasswordMatch = computed(() => {
    return this.newPassword() === this.confirmPassword();
  });
  protected checkPasswordNotOldPassword = computed(() => {
    return this.newPassword() !== this.currentPassword();
  });

  onSaveEmail(): void {
    console.log('Save Email clicked');
    this.toggleModalChange.emit(false);
  }
}
