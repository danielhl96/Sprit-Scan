import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { ScanFeature } from '../../features/scan/scan-feature';
import { ICONS } from '../icons';
import { LogoutService } from './logout-service';

export type NavbarElement = {
  name: string;
  route: string;
  /** SVG-Pfad (Heroicons, 24x24 outline) */
  icon: string;
};

const DEFAULT_NAVBAR_ELEMENTS: NavbarElement[] = [
  { name: 'Home', route: '/home', icon: ICONS.home },
  { name: 'Scan', route: '/scan', icon: ICONS.scan },
  { name: 'Profile', route: '/profile', icon: ICONS.profile },
  { name: 'AI', route: '/ai-expert', icon: ICONS.ai },
  { name: 'History', route: '/history', icon: ICONS.history },
  { name: 'Logout', route: '/logout', icon: ICONS.logout },
];

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar-component.html',
  standalone: true,
  imports: [CommonModule, RouterLink, ScanFeature],
})
export class NavbarComponent {
  router = inject(Router);
  logoutService = inject(LogoutService);
  elements = input<NavbarElement[]>(DEFAULT_NAVBAR_ELEMENTS);
  elementClick = output<NavbarElement>();
  navbarDisabled = input(false); // steuert den deaktivierten Zustand der Navbar

  listNavbarElements(): NavbarElement[] {
    return this.elements();
  }

  navgigateToRoute(route: string): void {
    this.router.navigate([route]);
  }

  menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.set(!this.menuOpen());
  }

  onElementClick(element: NavbarElement): void {
    if (element.route === '/scan') {
      this.openFileInput();
      this.menuOpen.set(false);
      this.navgigateToRoute(this.router.url); // Stay on the current route after opening the file input);
      return;
    }

    if (element.route === '/logout') {
      this.navgigateToRoute(element.route);
      this.logoutService.logout();
      this.menuOpen.set(false);
      return;
    }

    this.elementClick.emit(element);
    this.navgigateToRoute(element.route);
    this.menuOpen.set(false);
  }

  openFileInput(): void {
    document.getElementById('fileInput')?.click();
  }
}
