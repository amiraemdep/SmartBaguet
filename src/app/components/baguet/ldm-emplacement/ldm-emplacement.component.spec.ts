import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LdmEmplacementComponent } from './ldm-emplacement.component';

describe('LdmEmplacementComponent', () => {
  let component: LdmEmplacementComponent;
  let fixture: ComponentFixture<LdmEmplacementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdmEmplacementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LdmEmplacementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
