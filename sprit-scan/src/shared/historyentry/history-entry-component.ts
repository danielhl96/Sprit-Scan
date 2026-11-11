import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'history-entry-component',
  templateUrl: './history-entry-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class HistoryEntryComponent {
  entryText = input('');
  entryDate = input('');
  selectedEntry = input<{
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
  }>({
    id: 0,
    name: '',
    date: '',
    description: '',
  });
  toggleModal = input(false);
}
