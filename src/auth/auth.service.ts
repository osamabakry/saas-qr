import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, SetPasswordDto } from './dto/auth.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: (dto.role as UserRole) || UserRole.RESTAURANT_OWNER,
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    try {
      if (!dto.phone) {
        throw new UnauthorizedException('Phone number is required');
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is allowed to login without password
      // Only allow if requiresPasswordChange is true AND no password was provided
      if (!dto.password || dto.password.trim() === '') {
        if (!user.requiresPasswordChange) {
          throw new UnauthorizedException('Password is required');
        }

        // Allow login for password setup
        const tempToken = this.jwtService.sign(
          { sub: user.id, phone: user.phone, role: user.role, setupPassword: true },
          {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '15m', // Short-lived token for password setup
          },
        );

        return {
          user: {
            id: user.id,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          accessToken: tempToken,
          refreshToken: tempToken,
          requiresPasswordSetup: true,
        };
      }

      // Verify password for normal login
      const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.phone, user.role);

      return {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        ...tokens,
        requiresPasswordSetup: false,
      };
    } catch (error: any) {
      console.error('Login service error:', error);
      // Re-throw if it's already an UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Handle Prisma errors
      if (error.code === 'P2002' || error.code === 'P2025') {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new UnauthorizedException(error.message || 'Login failed');
    }
  }

  async setPassword(userId: string, dto: SetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new UnauthorizedException('Passwords do not match');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Update user password
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        requiresPasswordChange: false
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Generate new tokens (without setup flag)
    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    return {
      user,
      ...tokens,
      message: 'Password set successfully',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Verify token exists in database
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(
        payload.sub,
        payload.phone,
        payload.role,
      );

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { token: refreshToken },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
