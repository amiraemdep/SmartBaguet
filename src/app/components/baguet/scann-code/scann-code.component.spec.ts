import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScannCodeComponent } from './scann-code.component';

describe('ScannCodeComponent', () => {
  let component: ScannCodeComponent;
  let fixture: ComponentFixture<ScannCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScannCodeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScannCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
