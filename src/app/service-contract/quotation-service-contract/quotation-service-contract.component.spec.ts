import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { QuotationServiceContractComponent } from './detail-service-contract.component';

describe('DetailOrderComponent', () => {
  let component: QuotationServiceContractComponent;
  let fixture: ComponentFixture<QuotationServiceContractComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ QuotationServiceContractComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QuotationServiceContractComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
