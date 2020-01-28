import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateServiceContractComponent } from './create-service-contract.component';

describe('CreateServiceContractComponent', () => {
  let component: CreateServiceContractComponent;
  let fixture: ComponentFixture<CreateServiceContractComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateServiceContractComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateServiceContractComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
