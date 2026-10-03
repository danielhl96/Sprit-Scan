import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { ModalComponent } from '../../shared/modal/modal-component';
import { EditPasswordService } from './edit-password.service';
import { NotificationService } from '../../shared/notification/notification-service';
@Component({
  selector: 'edit-password-modal',
  imports: [ButtonComponent, InputPasswordComponent, ModalComponent],
  templateUrl: './edit-password-modal.html',
})
export class EditPasswordModal {
  toggleModal = input(false);
  toggleModalChange = output<boolean>();
  editPasswordService: EditPasswordService = inject(EditPasswordService);
  notificationService: NotificationService = inject(NotificationService);
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

  protected onSavePassword(): void {
    this.toggleModalChange.emit(false);
    this.editPasswordService.editPassword(this.newPassword(), this.currentPassword()).subscribe({
      next: (response) => {
        this.notificationService.showNotification('Password updated successfully', 'success');
        this.toggleModalChange.emit(false);
      },
      error: (error) => {
        this.notificationService.showNotification(
          'Failed to update password. ' + error.message,
          'error',
        );
      },
    });
  }
}
