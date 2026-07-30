import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
  history: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  logout:
    'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
  profile:
    'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21c-2.676 0-5.216-.584-7.499-1.882z',
} as const;

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar-component.html',
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class NavbarComponent {
  @Input() elements: NavbarElement[] = [
    { name: 'Home', route: '/', icon: ICONS.home },
    { name: 'Profile', route: '/profile', icon: ICONS.profile },
    { name: 'History', route: '/history', icon: ICONS.history },
    { name: 'Logout', route: '/logout', icon: ICONS.logout },
  ];
  @Output() elementClick = new EventEmitter<NavbarElement>();

  listNavbarElements(): NavbarElement[] {
    return this.elements;
  }

  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  onElementClick(element: NavbarElement): void {
    this.elementClick.emit(element);
    this.menuOpen = false;
  }
}
