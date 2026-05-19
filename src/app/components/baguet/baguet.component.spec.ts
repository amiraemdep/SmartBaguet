import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaguetComponent } from './baguet.component';

describe('BaguetComponent', () => {
  let component: BaguetComponent;
  let fixture: ComponentFixture<BaguetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaguetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BaguetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
