import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class LoginFeatureService {
  constructor(private httpClientService: HttpClient) {}

  login(email: string, password: string) {
    const body = { email, password };
    return this.httpClientService.post('http://localhost:3000/api/auth/login', body);
  }
}
