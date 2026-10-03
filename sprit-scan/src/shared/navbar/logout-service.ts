import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LogoutService {
  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  logout() {
    this.http.post('http://localhost:3000/api/auth/logout', {}).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
      },
    });
  }
}
