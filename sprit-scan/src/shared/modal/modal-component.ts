import { Component, EventEmitter, Input, NgModule, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button-component';

@Component({
  selector: 'app-modal',
  templateUrl: './modal-component.html',
  standalone: true,
  imports: [ButtonComponent],
})
export class ModalComponent {
  @Input() toggleModal: boolean = false;
  @Output() toggleModalChange = new EventEmitter<boolean>();

  toggleChange(): void {
    this.toggleModal = !this.toggleModal;
    this.toggleModalChange.emit(this.toggleModal);
  }
}
