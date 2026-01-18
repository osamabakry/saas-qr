import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStaffRoleDto {
  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ enum: ['RESTAURANT_MANAGER', 'STAFF'] })
  @IsEnum(['RESTAURANT_MANAGER', 'STAFF'])
  role: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  permissions?: any;
}

export class UpdateStaffRoleDto {
  @ApiProperty({ required: false, enum: ['RESTAURANT_MANAGER', 'STAFF'] })
  @IsOptional()
  @IsEnum(['RESTAURANT_MANAGER', 'STAFF'])
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  permissions?: any;
}
