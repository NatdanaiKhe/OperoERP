import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, PrismaPg } from 'database';
import { tenantScopeExtension } from './tenant-scope.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    });

    // `$extends` returns a proxy over this instance. Return it from the
    // constructor so every consumer sees the tenant-scoped client. The
    // lifecycle hooks live on the prototype and are not reachable through the
    // proxy, so re-attach them explicitly.
    const extended = this.$extends(
      tenantScopeExtension as Parameters<PrismaClient['$extends']>[0],
    ) as unknown as PrismaService;
    extended.onModuleInit = () => extended.$connect();
    extended.onModuleDestroy = () => extended.$disconnect();
    return extended;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
