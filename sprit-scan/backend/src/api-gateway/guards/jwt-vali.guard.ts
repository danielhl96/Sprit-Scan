import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtValiGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const token =
      req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }); // prüft Signatur + exp
      req.user = payload; // optional: für Controller verfügbar machen
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
