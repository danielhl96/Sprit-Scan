import { Component, signal, input, output } from '@angular/core';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { ModalComponent } from '../../shared/modal/modal-component';
import { DeleteService } from './delete.service';
import { NotificationService } from '../../shared/notification/notification-service';
import { Router } from '@angular/router';
@Component({
  selector: 'delete-modal',
  imports: [ButtonComponent, InputPasswordComponent, ModalComponent],
  templateUrl: './delete-modal.html',
})
export class DeleteModal {
  toggleModal = input(false);
  toggleModalChange = output<boolean>();

  password = signal('');

  constructor(
    private deleteService: DeleteService,
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  onPasswordChange = (newPassword: string) => {
    this.password.set(newPassword);
  };

  onConfirmDelete(): void {
    this.deleteService.deleteUser(this.password()).subscribe({
      next: (response) => {
        this.notificationService.showNotification('User deleted successfully', 'success');
        this.toggleModalChange.emit(false);
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.notificationService.showNotification(
          'Failed to delete user. ' + error.message,
          'error',
        );
      },
    });
  }

  onCancel(): void {
    this.toggleModalChange.emit(false);
  }
}
