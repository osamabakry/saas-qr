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
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@ApiTags('Branches')
@Controller('restaurants/:restaurantId/branches')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a branch' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchesService.create(restaurantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all branches' })
  async findAll(@Param('restaurantId') restaurantId: string) {
    return this.branchesService.findAll(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch by ID' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.branchesService.findOne(id, restaurantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update branch' })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(id, restaurantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete branch' })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.branchesService.remove(id, restaurantId);
  }
}
