import { Test, TestingModule } from '@nestjs/testing';
import { QuickbooksController } from './quickbooks.controller';
import { QuickbooksService } from './quickbooks.service';

describe('QuickbooksController', () => {
  let controller: QuickbooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickbooksController],
      providers: [QuickbooksService],
    }).compile();

    controller = module.get<QuickbooksController>(QuickbooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
