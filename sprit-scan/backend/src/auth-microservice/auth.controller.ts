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
  Put,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import {
  LoginUserDto,
  RegisterUserDto,
  DeleteUserDto,
  ChangePasswordDto,
  ChangeEmailDto,
} from './auth.dto';
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
  @Put('email')
  @UseGuards(JwtAuthGuard)
  async changeEmail(
    @Req() req: AuthenticatedRequest,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user in token');
    }
    return this.authService.changeEmail(
      userId,
      changeEmailDto.newEmail,
      changeEmailDto.password,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Put('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user in token');
    }
    return this.authService.changePassword(
      userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
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
