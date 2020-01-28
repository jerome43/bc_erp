import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule }    from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatButtonModule, MatSortModule, MatPaginatorModule, MatTableModule, MatInputModule, MatMenuModule, MatToolbarModule, MatListModule, MatNativeDateModule, MAT_DATE_LOCALE} from '@angular/material';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatSelectModule} from '@angular/material/select';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatRadioModule} from '@angular/material/radio';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { HeaderComponent } from './header/header.component';
import { MobileMenuComponent } from './mobile-menu/mobile-menu.component';
import {FlexLayoutModule} from '@angular/flex-layout';
import {MatDialogModule} from '@angular/material/dialog';
import { CreateClientComponent } from './client/create-client/createClient.component';
import { ListClientComponent } from './client/list-client/list-client.component';
import { DetailClientComponent } from './client/detail-client/detail-client.component';
import {DialogCreateClientOverview} from "./client/create-client/createClient.component";
import {DialogDetailClientOverview} from "./client/detail-client/detail-client.component";
import {DialogListClientOverview} from "./client/list-client/list-client.component";
import {CreateProductComponent} from "./product/create-product/createProduct.component";
import {ListProductComponent} from "./product/list-product/list-product.component";
import {DetailProductComponent} from "./product/detail-product/detail-product.component";
import {DialogCreateProductOverview} from "./product/create-product/createProduct.component";
import {DialogDetailProductOverview} from "./product/detail-product/detail-product.component";
import {DialogListProductOverview} from "./product/list-product/list-product.component";
import { DetailOrderComponent } from './order/detail-order/detail-order.component';
import { ListOrderComponent } from './order/list-order/list-order.component';
import { CreateQuotationComponent } from './quotation/create-quotation/create-quotation.component';
import { DetailQuotationComponent } from './quotation/detail-quotation/detail-quotation.component';
import { ListQuotationComponent } from './quotation/list-quotation/list-quotation.component';
import {DialogCreateQuotationOverview} from "./quotation/create-quotation/create-quotation.component";
import {DialogListQuotationOverview} from "./quotation/list-quotation/list-quotation.component";
import {DialogDetailQuotationOverview} from "./quotation/detail-quotation/detail-quotation.component";
import {DialogDetailOrderOverview} from "./order/detail-order/detail-order.component";
import {DialogListOrderOverview} from "./order/list-order/list-order.component";
import { ExportOrderComponent } from './order/export-order/export-order.component';
import {DialogExportOrderOverview} from "./order/export-order/export-order.component";
import { StockComponent } from './product/stock/stock.component';
import {DialogStockOverview} from "./product/stock/stock.component";
import {CreateEmployeComponent} from "./employe/create-employe/createEmploye.component";
import {DetailEmployeComponent} from "./employe/detail-employe/detail-employe.component";
import {ListEmployeComponent} from "./employe/list-employe/list-employe.component";
import {DialogCreateEmployeOverview} from "./employe/create-employe/createEmploye.component";
import {DialogDetailEmployeOverview} from "./employe/detail-employe/detail-employe.component";
import {DialogListEmployeOverview} from "./employe/list-employe/list-employe.component";
import { MaintenanceComponent } from './maintenance/maintenance.component';
import {ListInvoiceComponent} from "./order/list-invoice/list-invoice.component";
import {
  DialogListServiceContractOverview,
  ListServiceContractComponent
} from "./service-contract/list-service-contract/list-service-contract.component";
import {CreateServiceContractComponent} from "./service-contract/create-service-contract/create-service-contract.component";
import {
  DetailServiceContractComponent,
  DialogDetailServiceContractOverview
} from "./service-contract/detail-service-contract/detail-service-contract.component";


@NgModule({
  declarations: [
    AppComponent,
    CreateClientComponent,
    ListClientComponent,
    DetailClientComponent,
    CreateProductComponent,
    ListProductComponent,
    DetailProductComponent,
    HeaderComponent,
    MobileMenuComponent,
    DialogCreateClientOverview,
    DialogDetailClientOverview,
    DialogListClientOverview,
    DialogCreateProductOverview,
    DialogDetailProductOverview,
    DialogListProductOverview,
    DialogCreateQuotationOverview,
    DialogListQuotationOverview,
    DialogDetailQuotationOverview,
    DialogDetailOrderOverview,
    DialogListOrderOverview,
    DialogListServiceContractOverview,
    DialogDetailServiceContractOverview,
    DetailOrderComponent,
    ListOrderComponent,
    ListInvoiceComponent,
    CreateQuotationComponent,
    DetailQuotationComponent,
    ListQuotationComponent,
    ExportOrderComponent,
    DialogExportOrderOverview,
    StockComponent,
    DialogStockOverview,
    CreateEmployeComponent,
    DetailEmployeComponent,
    ListEmployeComponent,
    DialogCreateEmployeOverview,
    DialogDetailEmployeOverview,
    DialogListEmployeOverview,
    MaintenanceComponent,
    CreateServiceContractComponent,
    DetailServiceContractComponent,
    ListServiceContractComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    AngularFireModule.initializeApp(environment.firebase),// imports firebase/app needed for everything
    AngularFirestoreModule, // imports firebase/firestore, only needed for database features
    AngularFireAuthModule, // imports firebase/auth, only needed for auth features,
    AngularFireStorageModule,// imports firebase/storage only needed for storage features
    BrowserAnimationsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSortModule,
    MatPaginatorModule,
    MatTableModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FlexLayoutModule,
    MatDialogModule,
  ],
  providers: [
    {provide: MAT_DATE_LOCALE, useValue: 'fr-FR'},
  ],
  bootstrap: [AppComponent],
  entryComponents : [
    DialogCreateClientOverview,
    DialogDetailClientOverview,
    DialogListClientOverview,
    DialogCreateProductOverview,
    DialogDetailProductOverview,
    DialogListProductOverview,
    DialogCreateQuotationOverview,
    DialogListQuotationOverview,
    DialogDetailQuotationOverview,
    DialogDetailOrderOverview,
    DialogListOrderOverview,
    DialogExportOrderOverview,
    DialogListServiceContractOverview,
    DialogDetailServiceContractOverview,
    DialogStockOverview,
    DialogCreateEmployeOverview,
    DialogDetailEmployeOverview,
    DialogListEmployeOverview,]
})
export class AppModule { }
