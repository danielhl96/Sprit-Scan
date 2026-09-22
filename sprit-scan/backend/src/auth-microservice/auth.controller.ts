import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  HttpStatus,
  HttpCode,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: { username: string; password: string }) {
    this.authService.login(loginDto.username, loginDto.password);
  }
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() registerDto: { username: string; password: string }) {
    this.authService.register(registerDto.username, registerDto.password);
  }
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout() {
    this.authService.logout();
  }
}
