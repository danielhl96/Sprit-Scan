import { Component, inject, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputEmailComponent } from '../../shared/input-email/input-email-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { ModalComponent } from '../../shared/modal/modal-component';
import { EditEmailService } from './edit-email.service';
import { NotificationService } from '../../shared/notification/notification-service';
@Component({
  selector: 'edit-email-modal',
  imports: [ButtonComponent, InputEmailComponent, InputPasswordComponent, ModalComponent],
  templateUrl: './edit-email-modal.html',
})
export class EditEmailModal {
  toggleModal = input(false);
  toggleModalChange = output<boolean>();
  editEmailService: EditEmailService = inject(EditEmailService);
  notificationService: NotificationService = inject(NotificationService);

  email = signal('');
  password = signal('');

  onPasswordChange = (newPassword: string) => {
    this.password.set(newPassword);
  };

  onEmailChange = (newEmail: string) => {
    this.email.set(newEmail);
  };

  onSaveEmail(): void {
    this.toggleModalChange.emit(false);
    this.editEmailService.editEmail(this.email(), this.password()).subscribe({
      next: (response) => {
        this.notificationService.showNotification('Email updated successfully', 'success');
      },
      error: (error) => {
        this.notificationService.showNotification(
          'Failed to update email. ' + error.message,
          'error',
        );
      },
    });
  }
}
