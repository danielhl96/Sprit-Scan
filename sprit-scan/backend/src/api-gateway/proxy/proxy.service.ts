import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ServiceName, ServiceUrls } from '../config/services.config';

export interface ProxyRequestOptions {
  /** HTTP method to use against the microservice. */
  method: Method;
  /** Path (relative to the service base URL), e.g. '/login'. */
  path: string;
  /** Optional request body forwarded to the microservice. */
  data?: unknown;
  /** Optional query parameters forwarded to the microservice. */
  params?: Record<string, unknown>;
  /** Optional headers forwarded to the microservice. */
  headers?: Record<string, string>;
}

/**
 * Generic REST proxy. Forwards an incoming request to the target
 * microservice and returns the response body. All communication between
 * the gateway and the microservices happens over REST (HTTP + JSON).
 */
@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /** Resolve the configured base URL for a given microservice. */
  private getServiceUrl(service: ServiceName): string {
    const services = this.configService.get<ServiceUrls>('services');
    if (!services || !services[service]) {
      throw new HttpException(
        `No base URL configured for the "${service}" microservice.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return services[service];
  }

  /**
   * Forward a request to the given microservice and return its response data.
   */
  async forward<T = unknown>(
    service: ServiceName,
    options: ProxyRequestOptions,
  ): Promise<T> {
    const baseUrl = this.getServiceUrl(service);
    const url = `${baseUrl}${options.path}`;

    const config: AxiosRequestConfig = {
      url,
      method: options.method,
      data: options.data,
      params: options.params,
      headers: options.headers,
    };

    this.logger.debug(`→ ${options.method} ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>(config),
      );
      return response.data;
    } catch (error) {
      throw this.handleError(service, error as AxiosError);
    }
  }

  /**
   * Translate an axios error into a proper Nest HttpException so the client
   * receives a meaningful status code instead of a generic 500.
   */
  private handleError(service: ServiceName, error: AxiosError): HttpException {
    // The microservice responded with an error status code.
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as Record<string, unknown> | undefined;
      this.logger.warn(
        `Service "${service}" responded with ${status}: ${JSON.stringify(data)}`,
      );
      return new HttpException(data ?? error.message, status);
    }

    // The microservice could not be reached at all.
    this.logger.error(`Service "${service}" is unreachable: ${error.message}`);
    return new HttpException(
      `The "${service}" service is currently unavailable.`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
