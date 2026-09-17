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

    // `$extends` returns a proxy over this instance; the model delegates are
    // only reachable through its get-trap, so nothing is copied. Return the
    // proxy from the constructor so Nest (and every `this.prisma` consumer)
    // holds the tenant-scoped client. The prototype lifecycle hooks resolve
    // through the proxy too, with `this` bound to it.
    return this.$extends(
      tenantScopeExtension as Parameters<PrismaClient['$extends']>[0],
    ) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
