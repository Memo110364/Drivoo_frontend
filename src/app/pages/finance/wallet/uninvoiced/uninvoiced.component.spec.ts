import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UninvoicedComponent } from './uninvoiced.component';

describe('UninvoicedComponent', () => {
  let component: UninvoicedComponent;
  let fixture: ComponentFixture<UninvoicedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UninvoicedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UninvoicedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
