import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalComponent } from '../../shared/modal/modal-component';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { Result } from '../../shared/result/result';
import { HistoryEntry } from './history-feature.service';
import { HistoryEntryComponent } from '../../shared/historyentry/history-entry-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { ScanStore } from '../../shared/scan-store/scan-store';
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
  private readonly scanStore = inject(ScanStore);

  ngOnInit(): void {
    this.scanStore.load();
  }

  inputSearchValue(value: string) {
    this.inputSearch.set(value);
  }

  deleteEntry(id: number): void {
    this.scanStore.deleteEntry(id);
  }

  selectModal(id: number) {
    this.selectedEntry.set(this.scanStore.entries().find((entry) => entry.id === id) || null);
    if (this.selectedEntry()) {
      this.toggleModal.set(true);
    }
  }

  HistoryEntry = computed(() => {
    return this.scanStore
      .entries()
      .filter((entry) => entry.name.toLowerCase().includes(this.inputSearch().toLowerCase()));
  });
}
