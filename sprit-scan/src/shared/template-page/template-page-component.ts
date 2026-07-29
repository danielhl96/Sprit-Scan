import { Component, HostListener, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-template-page',
  templateUrl: './template-page-component.html',

  standalone: true,
  imports: [CommonModule],
})
export class TemplatePageComponent {
  /** Breakpoint: ab dieser Breite gilt das Gerät nicht mehr als Smartphone */
  private static readonly MOBILE_BREAKPOINT = 768;

  readonly isMobile = signal(this.checkIsMobile());

  @Input() title = 'Template Page';

  setTitle(title: string): void {
    this.title = title;
  }
  getTitle(): string {
    return this.title;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(this.checkIsMobile());
  }

  private checkIsMobile(): boolean {
    return window.innerWidth < TemplatePageComponent.MOBILE_BREAKPOINT;
  }
}
