import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NG_APP_ROOT_DOMAIN } from '../../app/api/api-root-domain';
@Injectable({ providedIn: 'root' })
export class EmailService {
  constructor(private httpClientService: HttpClient) {}

  getEmail() {
    return this.httpClientService.get<{ email: string }>(NG_APP_ROOT_DOMAIN + 'auth/email');
  }
}
