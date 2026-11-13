import { Injectable, computed, inject, signal } from '@angular/core';
import {
  HistoryFeatureService,
  HistoryEntry,
} from '../../features/history/history-feature.service';
import { NotificationService } from '../notification/notification-service';

@Injectable({ providedIn: 'root' })
export class ScanStore {
  private readonly historyFeatureService = inject(HistoryFeatureService);
  private readonly notificationService = inject(NotificationService);

  private readonly entriesSignal = signal<HistoryEntry[]>([]);
  private readonly loadingSignal = signal(false);
  private hasLoaded = false;

  readonly entries = computed(() => this.entriesSignal());
  readonly isLoading = computed(() => this.loadingSignal());

  load(force = false): void {
    if (this.hasLoaded && !force) {
      return;
    }
    this.hasLoaded = true;
    this.loadingSignal.set(true);
    this.historyFeatureService.getHistory().subscribe({
      next: (entries) => {
        this.entriesSignal.set(entries);
        this.loadingSignal.set(false);
      },
      error: (error) => {
        console.error('Error fetching history entries:', error);
        this.loadingSignal.set(false);
      },
    });
  }

  addEntry(entry: HistoryEntry | null): void {
    if (!entry) {
      return;
    }
    this.entriesSignal.set([entry, ...this.entriesSignal()]);
  }

  deleteEntry(id: number): void {
    this.historyFeatureService.deleteHistoryEntry(id).subscribe({
      next: () => {
        this.entriesSignal.set(this.entriesSignal().filter((entry) => entry.id !== id));
        this.notificationService.showNotification('Entry deleted successfully', 'success');
      },
      error: () => {
        this.notificationService.showNotification(
          'Failed to delete entry. Please try again.',
          'error',
        );
      },
    });
  }
}
