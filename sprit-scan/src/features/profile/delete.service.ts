import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NG_APP_ROOT_DOMAIN } from '../../app/api/api-root-domain';
@Injectable({ providedIn: 'root' })
export class DeleteService {
  constructor(private httpClientService: HttpClient) {}

  deleteUser(password: string) {
    const body = { password };
    return this.httpClientService.delete(NG_APP_ROOT_DOMAIN + 'auth/user', { body });
  }
}
