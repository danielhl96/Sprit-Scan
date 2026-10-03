import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NG_APP_ROOT_DOMAIN } from '../../app/api/api-root-domain';
@Injectable({ providedIn: 'root' })
export class EditPasswordService {
  constructor(private httpClientService: HttpClient) {}

  editPassword(newPassword: string, oldPassword: string) {
    const body = { newPassword, oldPassword };
    return this.httpClientService.put(NG_APP_ROOT_DOMAIN + 'auth/password', body);
  }
}
