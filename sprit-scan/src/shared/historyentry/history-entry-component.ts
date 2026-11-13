import { Component, computed, input, output, signal } from '@angular/core';
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
  entryId = input(0);

  // Wird ausgelöst, wenn der Eintrag per Swipe gelöscht werden soll.
  deleted = output<number>();

  // Ob gerade gezogen wird (Pointer gedrückt).
  private dragging = signal(false);
  // X-Position, an der das Ziehen begonnen hat (relativ zum Element).
  private startX = signal(0);
  // Verhindert, dass pro Swipe mehrfach gelöscht wird.
  private deleteEmitted = signal(false);
  // Fortschritt 0..1: 0 = Icon komplett versteckt, 1 = komplett sichtbar.
  revealProgress = signal(0);

  // Ab diesem Fortschritt gilt das Element als "zum Löschen freigegeben".
  private static readonly DELETE_THRESHOLD = 1;

  // Icon wird von rechts hereingeschoben: bei progress 0 → 100% nach rechts raus.
  iconTranslate = computed(() => (1 - this.revealProgress()) * 100);
  // Text blendet beim Ziehen aus.
  textOpacity = computed(() => 1 - this.revealProgress());

  onPointerDown(event: PointerEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dragging.set(true);
    this.deleteEmitted.set(false);
    this.startX.set(event.clientX - rect.left);
    // Pointer einfangen, damit Bewegung auch außerhalb des Elements ankommt.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onMove(event: PointerEvent): void {
    if (!this.dragging()) {
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    // Nach links ziehen => Fortschritt steigt.
    const delta = this.startX() - currentX;
    const progress = Math.min(Math.max(delta / rect.width, 0), 1);
    this.revealProgress.set(progress);

    // Schwelle erreicht: einmalig Löschen anstoßen.
    if (progress >= HistoryEntryComponent.DELETE_THRESHOLD && !this.deleteEmitted()) {
      this.deleteEmitted.set(true);
      this.deleted.emit(this.entryId());
    }
  }

  onPointerUp(): void {
    this.dragging.set(false);
    // Wenn Schwelle nicht erreicht wurde, zurück in Ausgangslage gleiten.
    if (!this.deleteEmitted()) {
      this.revealProgress.set(0);
    }
  }
}
