import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailQuotationComponent } from './detail-quotation.component';

describe('DetailQuotationComponent', () => {
  let component: DetailQuotationComponent;
  let fixture: ComponentFixture<DetailQuotationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailQuotationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailQuotationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
