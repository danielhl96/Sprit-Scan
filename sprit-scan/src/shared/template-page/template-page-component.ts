import { Component, HostListener, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar-component';
import { DockComponent } from '../dock/dock-component';

@Component({
  selector: 'app-template-page',
  templateUrl: './template-page-component.html',

  standalone: true,
  imports: [CommonModule, NavbarComponent, DockComponent],
})
export class TemplatePageComponent {
  /** Breakpoint: ab dieser Breite gilt das Gerät nicht mehr als Smartphone */
  private static readonly MOBILE_BREAKPOINT = 768;

  readonly isMobile = signal(this.checkIsMobile());

  @Input() title = 'Template Page';
  @Input() DockDisabled = false; // Input property to control the disabled state of the dock
  @Input() NavbarDisabled = false; // Input property to control the disabled state of the navbar
  @Output() dockElementClick = new EventEmitter<string>();

  onDockElementClick(route: string): void {
    this.dockElementClick.emit(route);
  }

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
