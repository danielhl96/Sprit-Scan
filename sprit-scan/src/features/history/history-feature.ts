import { Component, computed, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalComponent } from '../../shared/modal/modal-component';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { Result } from '../../shared/result/result';
import { HistoryFeatureService, HistoryEntry } from './history-feature.service';
import { HistoryEntryComponent } from '../../shared/historyentry/history-entry-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { NotificationService } from '../../shared/notification/notification-service';
@Component({
  selector: 'history-feature',
  imports: [
    ModalComponent,
    TemplatePageComponent,
    Result,
    DatePipe,
    HistoryEntryComponent,
    ButtonComponent,
  ],
  templateUrl: './history-feature.html',
  standalone: true,
})
export class HistoryFeature {
  toggleModal = signal(false);
  inputSearch = signal('');
  selectedEntry = signal<HistoryEntry | null>(null);
  NotificationService = inject(NotificationService);
  private readonly historyFeatureService = inject(HistoryFeatureService);

  ngOnInit(): void {
    this.historyFeatureService.getHistory().subscribe({
      next: (entries) => {
        this.listOfHistoryEntries.set(entries);
      },
      error: (error) => {
        console.error('Error fetching history entries:', error);
      },
    });
  }

  toggleModalChange = output<boolean>();
  listOfHistoryEntries = signal<HistoryEntry[]>([]);

  inputSearchValue(value: string) {
    this.inputSearch.set(value);
  }

  deleteEntry(id: number): void {
    this.historyFeatureService.deleteHistoryEntry(id).subscribe({
      next: () => {
        const updatedEntries = this.listOfHistoryEntries().filter((entry) => entry.id !== id);
        this.listOfHistoryEntries.set(updatedEntries);
        this.NotificationService.showNotification('Entry deleted successfully', 'success');
      },
      error: (error) => {
        this.NotificationService.showNotification(
          'Failed to delete entry. Please try again.',
          'error',
        );
      },
    });
  }

  selectModal(id: number) {
    this.selectedEntry.set(this.listOfHistoryEntries().find((entry) => entry.id === id) || null);
    if (this.selectedEntry()) {
      this.toggleModal.set(true);
    }
  }

  HistoryEntry = computed(() => {
    return this.listOfHistoryEntries().filter((entry) =>
      entry.name.toLowerCase().includes(this.inputSearch().toLowerCase()),
    );
  });
}
