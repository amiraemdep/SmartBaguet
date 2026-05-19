import { TestBed } from '@angular/core/testing';

import { BaguetServiceService } from './baguet-service.service';

describe('BaguetServiceService', () => {
  let service: BaguetServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaguetServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
