import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button-component';

@Component({
  selector: 'app-modal',
  templateUrl: './modal-component.html',
  standalone: true,
  imports: [ButtonComponent],
})
export class ModalComponent {
  toggleModal = model<boolean>(false);

  toggleChange(): void {
    this.toggleModal.set(!this.toggleModal());
  }
}
