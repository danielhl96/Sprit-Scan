import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class EditEmailService {
  constructor(private httpClientService: HttpClient) {}

  editEmail(newEmail: string, password: string) {
    const body = { newEmail, password };
    return this.httpClientService.put('http://localhost:3000/api/auth/email', body);
  }
}
