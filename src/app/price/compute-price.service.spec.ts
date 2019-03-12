import { TestBed } from '@angular/core/testing';

import { ComputePriceService } from './compute-price.service';

describe('ComputePriceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ComputePriceService = TestBed.get(ComputePriceService);
    expect(service).toBeTruthy();
  });
});
