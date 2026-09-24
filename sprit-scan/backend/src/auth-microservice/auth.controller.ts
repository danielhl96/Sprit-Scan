import {
  Controller,
  Post,
  HttpStatus,
  HttpCode,
  Delete,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginUserDto, RegisterUserDto, DeleteUserDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from '../types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginUserDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    return this.authService.register(registerDto.email, registerDto.password);
  }
  @HttpCode(HttpStatus.OK)
  @Delete('user/')
  @UseGuards(JwtAuthGuard)
  async deleteUser(
    @Req() req: AuthenticatedRequest,
    @Body() deleteUserDto: DeleteUserDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user in token');
    }
    return this.authService.deleteUser(userId, deleteUserDto.password);
  }
}
