import { Component, computed, inject, output, signal } from '@angular/core';
import { ModalComponent } from '../../shared/modal/modal-component';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { Result } from '../../shared/result/result';
import { HistoryFeatureService, HistoryEntry } from './history-feature.service';

@Component({
  selector: 'history-feature',
  imports: [ModalComponent, TemplatePageComponent, Result],
  templateUrl: './history-feature.html',
  standalone: true,
})
export class HistoryFeature {
  toggleModal = signal(false);
  inputSearch = signal('');
  selectedEntry = signal<HistoryEntry | null>(null);

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
