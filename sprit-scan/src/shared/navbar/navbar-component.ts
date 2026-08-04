import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';

export type NavbarElement = {
  name: string;
  route: string;
  /** SVG-Pfad (Heroicons, 24x24 outline) */
  icon: string;
};

/** Heroicons (outline, 24x24) */
const ICONS = {
  home: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  info: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  history:
    'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  logout:
    'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
  profile:
    'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21c-2.676 0-5.216-.584-7.499-1.882z',
  scan: 'M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z',
} as const;

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar-component.html',
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class NavbarComponent {
  router = inject(Router);

  @Input() elements: NavbarElement[] = [
    { name: 'Home', route: '/home', icon: ICONS.home },
    { name: 'Scan', route: '/scan', icon: ICONS.scan },
    { name: 'Profile', route: '/profile', icon: ICONS.profile },
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
    this.elementClick.emit(element);
    this.navgigateToRoute(element.route);
    this.menuOpen = false;
  }
}
