import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NG_APP_ROOT_DOMAIN } from '../../app/api/api-root-domain';
@Injectable({ providedIn: 'root' })
export class RegisterFeatureService {
  constructor(private httpClientService: HttpClient) {}

  register(email: string, password: string) {
    const body = { email, password };
    return this.httpClientService.post(`${NG_APP_ROOT_DOMAIN}/auth/register`, body);
  }
}
