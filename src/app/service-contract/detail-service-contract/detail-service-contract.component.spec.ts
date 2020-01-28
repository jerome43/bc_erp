import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailServiceContractComponent } from './detail-service-contract.component';

describe('DetailOrderComponent', () => {
  let component: DetailServiceContractComponent;
  let fixture: ComponentFixture<DetailServiceContractComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailServiceContractComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailServiceContractComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
