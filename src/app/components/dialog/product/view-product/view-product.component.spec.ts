import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewProductComponent } from './view-product.component';
import { TranslateService } from '@ngx-translate/core';
describe('ViewProductComponent', () => {
  let component: ViewProductComponent;
  let fixture: ComponentFixture<ViewProductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewProductComponent],
      providers: [TranslateService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
