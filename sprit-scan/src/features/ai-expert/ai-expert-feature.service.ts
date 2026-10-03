import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NG_APP_ROOT_DOMAIN } from '../../app/api/api-root-domain';
@Injectable({ providedIn: 'root' })
export class AiFeatureService {
  constructor(private httpClientService: HttpClient) {}

  expert(prompt: string) {
    const body = { prompt };
    return this.httpClientService.post(NG_APP_ROOT_DOMAIN + 'ai/expert', body);
  }

  sprits(image: string) {
    const body = { imageUrl: image };
    return this.httpClientService.post(NG_APP_ROOT_DOMAIN + 'ai/spirits', body);
  }
}
