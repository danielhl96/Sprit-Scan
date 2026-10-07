import { Component, signal, computed, inject, output } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ModalComponent } from '../../shared/modal/modal-component';
import { Result } from '../../shared/result/result';
import { ScanFeature } from '../scan/scan-feature';
import { HistoryFeatureService, HistoryEntry } from '../history/history-feature.service';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'home-feature',
  imports: [TemplatePageComponent, ModalComponent, Result, ScanFeature, DatePipe],
  templateUrl: './home-feature.html',
})
export class HomeFeature {
  protected readonly title = signal('sprit-scan');
  toggleModal = signal(false);
  toggleModalChange = output<boolean>();
  selectedEntry = signal<HistoryEntry | null>(null);
  isLoading = signal(false);
  ngOnInit(): void {
    this.isLoading.set(true);
    this.historyFeatureService.getHistory().subscribe({
      next: (entries) => {
        this.lastScans.set(entries);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching history entries:', error);
        this.isLoading.set(false);
      },
    });
  }

  private readonly historyFeatureService = inject(HistoryFeatureService);

  lastScans = signal<HistoryEntry[]>([]);

  get Scans(): HistoryEntry[] {
    return this.lastScans();
  }

  openFileInput() {
    document.getElementById('fileInput')?.click();
  }
}
