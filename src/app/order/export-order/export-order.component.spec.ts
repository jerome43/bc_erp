import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportOrderComponent } from './export-order.component';

describe('ExportOrderComponent', () => {
  let component: ExportOrderComponent;
  let fixture: ComponentFixture<ExportOrderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExportOrderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
