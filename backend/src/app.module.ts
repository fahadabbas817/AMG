import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PlatformsModule } from './platforms/platforms.module';
import { ConfigModule } from '@nestjs/config';
import { VendorsModule } from './vendors/vendors.module';
import { RevenueModule } from './revenue/revenue.module';
import { PayoutModule } from './payout/payout.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PlatformsModule,
    VendorsModule,
    RevenueModule,
    PayoutModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
