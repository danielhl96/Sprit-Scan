import { Component, EventEmitter, Input, NgModule, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  templateUrl: './modal-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class ModalComponent {
  @Input() toggleModal: boolean = false;
  @Output() toggleModalChange = new EventEmitter<boolean>();

  toggleChange(): void {
    this.toggleModal = !this.toggleModal;
    this.toggleModalChange.emit(this.toggleModal);
  }
}
