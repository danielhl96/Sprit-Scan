import { Component, signal, input, output } from '@angular/core';
import { ButtonComponent } from '../../shared/button/button-component';
import { InputPasswordComponent } from '../../shared/input-password/input-password-component';
import { ModalComponent } from '../../shared/modal/modal-component';

@Component({
  selector: 'delete-modal',
  imports: [ButtonComponent, InputPasswordComponent, ModalComponent],
  templateUrl: './delete-modal.html',
})
export class DeleteModal {
  toggleModal = input(false);
  toggleModalChange = output<boolean>();

  password = signal('');

  onPasswordChange = (newPassword: string) => {
    this.password.set(newPassword);
  };

  onConfirmDelete(): void {
    console.log('Delete account confirmed');
    this.toggleModalChange.emit(false);
  }
}
