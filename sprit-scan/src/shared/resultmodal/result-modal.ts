import { Component, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button-component';
import { ModalComponent } from '../modal/modal-component';

type HistoryEntry = {
  id: number;
  name: string;
  date: string;
  description: string;
  taste?: string;
  origin?: string;
  recommendation?: string;
  year?: string;
  customerreview?: string;
  rawmaterials?: string;
  alternative?: string;
  price?: string;
};

@Component({
  selector: 'result-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './result-modal.html',
})
export class ResultModal {
  toggleModal = signal(false);
  setToggleModal = signal(false);
  entry = input<HistoryEntry>({
    id: 0,
    name: '',
    date: '',
    description: '',
    taste: '',
    origin: '',
    recommendation: '',
    year: '',
    customerreview: '',
    rawmaterials: '',
    alternative: '',
    price: '',
  });
}
