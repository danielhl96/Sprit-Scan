import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NG_APP_ROOT_DOMAIN } from '../../app/api/api-root-domain';
@Injectable({ providedIn: 'root' })
export class EditEmailService {
  constructor(private httpClientService: HttpClient) {}

  editEmail(newEmail: string, password: string) {
    const body = { newEmail, password };
    return this.httpClientService.put(NG_APP_ROOT_DOMAIN + 'auth/email', body);
  }
}
