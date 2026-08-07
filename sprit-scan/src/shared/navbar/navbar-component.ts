import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { ScanFeature } from '../../features/scan/scan-feature';
import { ICONS } from '../icons';

export type NavbarElement = {
  name: string;
  route: string;
  /** SVG-Pfad (Heroicons, 24x24 outline) */
  icon: string;
};

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar-component.html',
  standalone: true,
  imports: [CommonModule, RouterLink, ScanFeature],
})
export class NavbarComponent {
  router = inject(Router);

  @Input() elements: NavbarElement[] = [
    { name: 'Home', route: '/home', icon: ICONS.home },
    { name: 'Scan', route: '/scan', icon: ICONS.scan },
    { name: 'Profile', route: '/profile', icon: ICONS.profile },
    { name: 'AI', route: '/ai-expert', icon: ICONS.ai },
    { name: 'History', route: '/history', icon: ICONS.history },

    { name: 'Logout', route: '/logout', icon: ICONS.logout },
  ];
  @Output() elementClick = new EventEmitter<NavbarElement>();
  @Input() navbarDisabled = false; // Input property to control the disabled state of the navbar
  listNavbarElements(): NavbarElement[] {
    return this.elements;
  }

  navgigateToRoute(route: string): void {
    this.router.navigate([route]);
  }

  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  onElementClick(element: NavbarElement): void {
    if (element.route === '/scan') {
      this.openFileInput();
      this.menuOpen = false;
      this.navgigateToRoute(this.router.url); // Stay on the current route after opening the file input);
      return;
    }
    this.elementClick.emit(element);
    this.navgigateToRoute(element.route);
    this.menuOpen = false;
  }

  openFileInput(): void {
    document.getElementById('fileInput')?.click();
  }
}
