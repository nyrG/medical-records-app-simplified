import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionController } from './extraction.controller';

describe('ExtractionController', () => {
  let controller: ExtractionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExtractionController],
    }).compile();

    controller = module.get<ExtractionController>(ExtractionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
