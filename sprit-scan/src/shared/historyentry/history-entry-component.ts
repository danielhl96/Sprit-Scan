import { Component, inject, input } from '@angular/core';
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
}
