import { Test, TestingModule } from '@nestjs/testing';
import { VendorDashboardController } from './vendor-dashboard.controller';
import { VendorDashboardService } from './vendor-dashboard.service';

describe('VendorDashboardController', () => {
  let controller: VendorDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorDashboardController],
      providers: [VendorDashboardService],
    }).compile();

    controller = module.get<VendorDashboardController>(VendorDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
