import { Injectable, OnModuleDestroy, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Get database URL and modify for connection pooling issues
    let databaseUrl = process.env.DATABASE_URL || '';
    
    // If using Supabase pooler (port 6543), add parameters to disable prepared statements
    if (databaseUrl.includes(':6543') || databaseUrl.includes('pooler')) {
      // Add connection parameters to work with pooler
      const url = new URL(databaseUrl);
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('connect_timeout', '10');
      databaseUrl = url.toString();
    }

    super({
      log: ['error', 'warn'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      // Disable prepared statements for pooler connections
      ...(databaseUrl.includes(':6543') || databaseUrl.includes('pooler') ? {
        __internal: {
          engine: {
            connectTimeout: 10000,
          },
        },
      } : {}),
    });
  }

  async onModuleInit() {
    try {
      // Retry connection with exponential backoff
      let retries = 3;
      let delay = 1000;
      
      while (retries > 0) {
        try {
          await this.$connect();
          this.logger.log('Database connected successfully');
          return;
        } catch (error: any) {
          retries--;
          if (retries === 0) {
            this.logger.error('Failed to connect to database after retries', error);
            this.logger.error('Please check your DATABASE_URL in .env file');
            this.logger.error('Make sure you are using the correct connection string from Supabase');
            // Don't throw - let the app start, connection will be retried on first query
            return;
          }
          this.logger.warn(`Database connection failed, retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      // Don't throw - let the app start
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
