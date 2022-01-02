import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DetailClientComponent }  from './client/detail-client/detail-client.component';
import {CreateClientComponent} from "./client/create-client/createClient.component";
import {ListClientComponent} from "./client/list-client/list-client.component";
import {CreateProductComponent} from "./product/create-product/createProduct.component";
import {DetailProductComponent} from "./product/detail-product/detail-product.component";
import {ListProductComponent} from "./product/list-product/list-product.component";
import { AuthGuard } from './auth/auth.guard';
import {ListOrderComponent} from "./order/list-order/list-order.component";
import {DetailOrderComponent} from "./order/detail-order/detail-order.component";
import {CreateQuotationComponent} from "./quotation/create-quotation/create-quotation.component";
import {ListQuotationComponent} from "./quotation/list-quotation/list-quotation.component";
import {DetailQuotationComponent} from "./quotation/detail-quotation/detail-quotation.component";
import {StockComponent} from "./product/stock/stock.component";
import {CreateEmployeComponent} from "./employe/create-employe/createEmploye.component";
import {ListEmployeComponent} from "./employe/list-employe/list-employe.component";
import {DetailEmployeComponent} from "./employe/detail-employe/detail-employe.component";
import { MaintenanceComponent } from './maintenance/maintenance.component';
import {ListInvoiceComponent} from "./order/list-invoice/list-invoice.component";
import {DetailServiceContractComponent} from "./service-contract/detail-service-contract/detail-service-contract.component";
import {ListServiceContractComponent} from "./service-contract/list-service-contract/list-service-contract.component";
import {CreateServiceContractComponent} from "./service-contract/create-service-contract/create-service-contract.component";
import {QuotationServiceContractComponent} from "./service-contract/quotation-service-contract/quotation-service-contract.component";
import {ListQuotationServiceContractComponent} from "./service-contract/list-quotation-service-contract/list-quotation-service-contract.component";

const routes: Routes = [
  { path: '', canActivate: [AuthGuard], redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: CreateQuotationComponent},
  { path: 'create-client', canActivate: [AuthGuard], component: CreateClientComponent},
  { path: 'detail-client/:clientId', canActivate: [AuthGuard], component: DetailClientComponent},
  {path: 'list-clients', canActivate: [AuthGuard], component: ListClientComponent},
  { path: 'create-product', canActivate: [AuthGuard], component: CreateProductComponent},
  { path: 'detail-product/:productId', canActivate: [AuthGuard], component: DetailProductComponent},
  {path: 'list-products', canActivate: [AuthGuard], component: ListProductComponent},
  { path: 'list-orders', canActivate: [AuthGuard], component: ListOrderComponent},
  { path: 'detail-order/:orderId', canActivate: [AuthGuard], component: DetailOrderComponent},
  { path : 'list-invoices', canActivate: [AuthGuard], component: ListInvoiceComponent},
  { path : 'detail-service-contract/:serviceContractId', canActivate : [AuthGuard], component : DetailServiceContractComponent},
  { path : 'create-service-contract', canActivate : [AuthGuard], component : CreateServiceContractComponent},
  { path : 'list-service-contract', canActivate : [AuthGuard], component : ListServiceContractComponent},
  { path : 'quotation-service-contract/:quotationServiceContractId', canActivate : [AuthGuard], component : QuotationServiceContractComponent},
  { path : 'list-quotation-service-contract', canActivate : [AuthGuard], component : ListQuotationServiceContractComponent},
  { path: 'create-quotation', canActivate: [AuthGuard], component: CreateQuotationComponent},
  { path: 'list-quotations', canActivate: [AuthGuard], component: ListQuotationComponent},
  { path: 'detail-quotation/:quotationId', canActivate: [AuthGuard], component: DetailQuotationComponent},
  { path: 'stock', canActivate: [AuthGuard], component: StockComponent},
  { path: 'create-employe', canActivate: [AuthGuard], component: CreateEmployeComponent},
  { path: 'list-employes', canActivate: [AuthGuard], component: ListEmployeComponent},
  { path: 'detail-employe/:employeId', canActivate: [AuthGuard], component: DetailEmployeComponent},
  { path: 'maintenance', canActivate: [AuthGuard], component: MaintenanceComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
