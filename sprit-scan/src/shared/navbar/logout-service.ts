import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NG_APP_ROOT_DOMAIN } from '../../app/api/api-root-domain';

@Injectable({
  providedIn: 'root',
})
export class LogoutService {
  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  logout() {
    this.http.post(NG_APP_ROOT_DOMAIN + 'auth/logout', {}).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
      },
    });
  }
}
