import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListServiceContractComponent } from './list-service-contract.component';

describe('ListServiceContractComponent', () => {
  let component: ListServiceContractComponent;
  let fixture: ComponentFixture<ListServiceContractComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListServiceContractComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListServiceContractComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
