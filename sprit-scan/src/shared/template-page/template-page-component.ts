import { Component, HostListener, signal, input, output } from '@angular/core';
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

  title = input('Template Page');
  DockDisabled = input(false); // steuert den deaktivierten Zustand des Docks
  NavbarDisabled = input(false); // steuert den deaktivierten Zustand der Navbar
  dockElementClick = output<string>();

  onDockElementClick(route: string): void {
    this.dockElementClick.emit(route);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(this.checkIsMobile());
  }

  private checkIsMobile(): boolean {
    return window.innerWidth < TemplatePageComponent.MOBILE_BREAKPOINT;
  }
}
