import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PlatformsModule } from './platforms/platforms.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { VendorsModule } from './vendors/vendors.module';
import { RevenueModule } from './revenue/revenue.module';
import { PayoutModule } from './payout/payout.module';
import { VendorDashboardModule } from './vendor-dashboard/vendor-dashboard.module';
import { ProfileModule } from './profile/profile.module';
import { QuickbooksModule } from './quickbooks/quickbooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    PlatformsModule,
    VendorsModule,
    RevenueModule,
    PayoutModule,
    VendorDashboardModule,
    ProfileModule,
    QuickbooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
