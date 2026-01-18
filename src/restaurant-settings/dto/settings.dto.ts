import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRestaurantSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customLogo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  languages?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowLanguageSwitch?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showPrices?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showTax?: boolean;
}
