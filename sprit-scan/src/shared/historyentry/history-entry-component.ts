import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryFeatureService } from '../../features/history/history-feature.service';

@Component({
  selector: 'history-entry-component',
  templateUrl: './history-entry-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class HistoryEntryComponent {
  HistoryFeatureService = inject(HistoryFeatureService);
  entryText = input('');
  entryDate = input('');
  entryId = input(0);
  position = signal({ x: 0, y: 0 });
  isSet = signal(false);

  onClick(): void {
    this.HistoryFeatureService.deleteHistoryEntry(this.entryId());
  }

  onMove(event: PointerEvent): void {
    console.log('id', this.entryId());
    console.log('Pointer moved:', event.clientX, event.clientY, event.pointerType);
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.position.set({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }
}
