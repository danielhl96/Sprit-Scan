import { Component, signal, inject } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ModalComponent } from '../../shared/modal/modal-component';
import { Result } from '../../shared/result/result';
import { ScanFeature } from '../scan/scan-feature';
import { HistoryEntry } from '../history/history-feature.service';
import { DatePipe } from '@angular/common';
import { HistoryEntryComponent } from '../../shared/historyentry/history-entry-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { ScanStore } from '../../shared/scan-store/scan-store';

@Component({
  selector: 'home-feature',
  imports: [
    TemplatePageComponent,
    ModalComponent,
    Result,
    ScanFeature,
    DatePipe,
    HistoryEntryComponent,
    ButtonComponent,
  ],
  templateUrl: './home-feature.html',
})
export class HomeFeature {
  protected readonly title = signal('sprit-scan');
  toggleModal = signal(false);
  selectedEntry = signal<HistoryEntry | null>(null);
  private readonly scanStore = inject(ScanStore);

  // Geteilter Zustand aus dem Store.
  readonly isLoading = this.scanStore.isLoading;
  readonly Scans = this.scanStore.entries;

  ngOnInit(): void {
    this.scanStore.load();
  }

  deleteEntry(id: number): void {
    this.scanStore.deleteEntry(id);
  }

  openFileInput() {
    document.getElementById('homeFileInput')?.click();
  }
}
