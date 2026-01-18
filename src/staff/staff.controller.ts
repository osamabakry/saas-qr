import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffRoleDto, UpdateStaffRoleDto } from './dto/staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@ApiTags('Staff')
@Controller('restaurants/:restaurantId/staff')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Add staff member' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateStaffRoleDto,
  ) {
    return this.staffService.create(restaurantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all staff members' })
  async findAll(@Param('restaurantId') restaurantId: string) {
    return this.staffService.findAll(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member by ID' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.staffService.findOne(id, restaurantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff member role' })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffRoleDto,
  ) {
    return this.staffService.update(id, restaurantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove staff member' })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.staffService.remove(id, restaurantId);
  }
}
