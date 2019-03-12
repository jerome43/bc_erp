import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListQuotationComponent } from './list-quotation.component';

describe('ListQuotationComponent', () => {
  let component: ListQuotationComponent;
  let fixture: ComponentFixture<ListQuotationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListQuotationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListQuotationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
