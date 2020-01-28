import {Injectable} from '@angular/core';
import {Product} from "../product";
import {AngularFirestore} from '@angular/fire/firestore';
import {StockProducts} from './StockProducts';
import {StockOrders} from './StockOrders';
import {firestore} from 'firebase/app';
import * as Rx from "rxjs";
import {Observable} from "rxjs";
import {ProductType} from "../ProductType";
import Timestamp = firestore.Timestamp;

export interface ProductId extends Product { id: string; }

@Injectable({
  providedIn: 'root'
})

export class StockService {

  constructor(private db: AngularFirestore) {
  }

  private newProductsImmoEmitter;

  private productsImmo = Rx.Observable.create(e => this.newProductsImmoEmitter = e); // tableau qui récapitule pour chaque produit de la commande les dates si il est dispo ou pas.

  verifyStock(singleProducts, compositeProducts, immoDateFrom, immoDateTo, orderId) { // renvoie un tableau des immobilisation du produit en indiquant si il est immobilisé (true) sur les dates entrées en paramètre e
    //console.log('verify stock');
    let products = singleProducts.slice(); // make a copy of the array
    //console.log("updateProductsStock products ", products);
    for (let idxPdt = 0; idxPdt < compositeProducts.length; idxPdt++) {
      products = products.concat(compositeProducts[idxPdt].compositeProductElements);
    }
    //console.log("updateProductsStock products ", products);

      let productsImmo: [{product: ProductId, orderId: string, isImmo: boolean, immoDateFrom:Timestamp, immoDateTo: Timestamp, quantity: number}];
      //console.log('products : ', products);
      let productsFiltered = products.filter(item => item !== ""); // on retire les éventuels produits vides, correspondant aux éléments de formulaire produits laissés vides
      //console.log('productsFiltered : ', productsFiltered);
      productsFiltered.forEach((product, idx)=> {
        // on ne gère pas les stocks pour les produits en vente et les prestations de service (produits non dégressifs)
        if (product.type === ProductType.rental || product.type === ProductType.longRental) {
          let path;
          product.type === ProductType.rental ? path='stockProducts/' : path = 'stockProducts-longRental/';
          let stockDoc = this.db.doc<StockProducts>(path + product.id).valueChanges();
          let stockDocSubscription = stockDoc.subscribe(stockProductsData=> {
            stockDocSubscription.unsubscribe();
            if (stockProductsData!=undefined) { // cas où le produit est déjà dans la liste des stocks
              let isImmo;
              for (let i = 0; i<stockProductsData.immoDates.length; i++) {
                isImmo=false;
                //if (stockProductsData.immoDates[i].orderId!= orderId) { // cas où l'on n'est pas dans une mise à jour de commande existante
                  if (this.isProductDatesOverlay(immoDateFrom, immoDateTo, stockProductsData.immoDates[i].immoDateFrom, stockProductsData.immoDates[i].immoDateTo)) {
                    isImmo=true;
                  }
                //}
                productsImmo==undefined ?  productsImmo = [{product: product, orderId: stockProductsData.immoDates[i].orderId, isImmo: isImmo, immoDateFrom: stockProductsData.immoDates[i].immoDateFrom, immoDateTo: stockProductsData.immoDates[i].immoDateTo, quantity: stockProductsData.immoDates[i].quantity}] : productsImmo.push({product: product, orderId: stockProductsData.immoDates[i].orderId, isImmo: isImmo, immoDateFrom: stockProductsData.immoDates[i].immoDateFrom, immoDateTo: stockProductsData.immoDates[i].immoDateTo, quantity: stockProductsData.immoDates[i].quantity});
              }
            } else { // cas où le produit n'est pas dans la liste des stocks
              productsImmo==undefined ?  productsImmo = [{product: product, orderId:orderId, isImmo: false, immoDateFrom: null, immoDateTo: null, quantity: null}] : productsImmo.push({product: product, orderId: orderId, isImmo: false, immoDateFrom: null, immoDateTo: null, quantity:null})
            }
            if (idx == productsFiltered.length-1) {
              //console.log('productsImmo', productsImmo);
              this.newProductsImmoEmitter.next(productsImmo)
            }
          });
        }
      });
  }

  public getProductsImmo() : Observable<any> {
    return this.productsImmo;
  }

  isProductDatesOverlay(immoDateFrom : Date, immoDateTo: Date, stockDataImmoDatesFrom: Timestamp, stockDataImmoDatesTo: Timestamp): boolean {
    let isOverlay =  false;
    if (immoDateFrom instanceof Date && immoDateTo instanceof Date) {
      if ((immoDateFrom.getTime()/1000>=stockDataImmoDatesFrom.seconds && immoDateFrom.getTime()/1000<=stockDataImmoDatesTo.seconds)
        || (immoDateTo.getTime()/1000>=stockDataImmoDatesFrom.seconds && immoDateTo.getTime()/1000<=stockDataImmoDatesTo.seconds )
        || (immoDateFrom.getTime()/1000<stockDataImmoDatesFrom.seconds && immoDateTo.getTime()/1000>=stockDataImmoDatesFrom.seconds)) {
        isOverlay = true;
      }
      //console.log(immoDateFrom.getTime()/1000 + ' ' + stockDataImmoDatesFrom.seconds + ' ' + immoDateTo.getTime()/1000 + ' ' + stockDataImmoDatesTo.seconds + ' ' + isOverlay);
    }
      return isOverlay;
  }

  updateProductsStock(singleProducts:ProductId[], singleProductsAmount:number[], compositeProducts:{compositeProductElements:ProductId[]}[], compositeProductsAmount:number[], immoDateFrom, immoDateTo, orderId:string) {
    //console.log("updateProductsStock");
    let products = singleProducts.slice(); // make a copy of the array
    //console.log("updateProductsStock products ", products);
    for (let idxPdt = 0; idxPdt < compositeProducts.length; idxPdt++) {
      products = products.concat(compositeProducts[idxPdt].compositeProductElements);
    }
    //console.log("updateProductsStock products ", products);

    let productsAmount = singleProductsAmount.slice();
    for (let idxPdt = 0; idxPdt < compositeProducts.length; idxPdt++) {
      for (let i= 0; i< compositeProducts[idxPdt].compositeProductElements.length; i++) {
        productsAmount.push(compositeProductsAmount[idxPdt])
      }
    }
    //console.log("updateProductsStock products ", products, "updateProductsStock productsAmount ", productsAmount);

    // mise à jours ou insertion des produits de la commande vers le stock
    products.forEach((product, idx)=> {
      if (product.id!=undefined && (product.type === ProductType.rental || product.type === ProductType.longRental)) {// on ne gère pas les stocks pour les produits en vente et les prestations de service (produits non dégressifs)
        let path;
        product.type === ProductType.rental ? path='stockProducts/' : path = 'stockProducts-longRental/';
        let stockProductsDoc = this.db.doc<StockProducts>(path + product.id).valueChanges();
        let stockProductsDocSubscription  = stockProductsDoc.subscribe(stockProductsData=> {
          stockProductsDocSubscription.unsubscribe();
          if (stockProductsData!=undefined) { // cas où le produit est déjà dans la liste des stocks
            let orderExist=false;
            for (let i = 0; i<stockProductsData.immoDates.length; i++) {
              if (stockProductsData.immoDates[i].orderId == orderId) {
                stockProductsData.immoDates[i].immoDateFrom = immoDateFrom; stockProductsData.immoDates[i].immoDateTo = immoDateTo; stockProductsData.immoDates[i].quantity = productsAmount[idx];
                orderExist=true;
                break;
              }
            }
            if (!orderExist) {stockProductsData.immoDates.push({orderId: orderId, immoDateFrom : immoDateFrom, immoDateTo : immoDateTo, quantity : productsAmount[idx]})}
            this.db.doc<StockProducts>(path + product.id).set(stockProductsData).then(()=> { // on ne fait pas un simple update car stockProductsData provient de valuechanges et a récupéré toutes les données
              //console.log('stock mis à jour.');
            })
          }
          else { // cas où le produit n'est pas dans la liste des stocks
            stockProductsData = { productId: product.id, productName: product.name, productStock: product.stock, immoDates : [{orderId: orderId, immoDateFrom : immoDateFrom, immoDateTo : immoDateTo, quantity : productsAmount[idx]}]};
            this.db.doc<StockProducts>(path + product.id).set(stockProductsData).then(()=> {
              //console.log('stock mis à jour.');
            })
          }
          //console.log("productsAmount[idx] : ", productsAmount[idx]);
          //console.log("stockProductsData : ", stockProductsData);
        });
      }
    });
    this.compareStockProductsAndStockOrders(products, orderId);
   }

  compareStockProductsAndStockOrders(products:ProductId[], orderId:string) {
    let stockOrderDoc = this.db.doc<StockOrders>('stockOrders/' + orderId).valueChanges();
    let stockOrderDocSubscription = stockOrderDoc.subscribe(stockOrderDatas=> {
      stockOrderDocSubscription.unsubscribe();
      //const onlyInStockProducts = products.filter(product => stockOrderDatas.productsId.find(function(stockOrderProductId){return stockOrderProductId==product.id})==undefined);
      if (stockOrderDatas!=undefined) {
        const productsToRemove = stockOrderDatas.productsId.filter(stockOrderProductId => products.find(function(product) {return product.id == stockOrderProductId})==undefined);
        if (productsToRemove.length>=1) {
          this.removeInStockProducts(productsToRemove, orderId);
        }
      }
      this.updateStockOrders(products, orderId);
    });
  }

  updateStockOrders(products:ProductId[], orderId:string) {
    let productsId : string[]=[];
    products.forEach(product=> {
      if (product.id!=undefined && (product.type === ProductType.rental || product.type === ProductType.longRental) ) {
        productsId.push(product.id);
      }
    });
    const stockOrder:StockOrders = {orderId: orderId, productsId : productsId};
    //console.log("stockOrder", stockOrder);
    this.db.doc<StockOrders>('stockOrders/' + orderId).set(stockOrder).then(()=> { // on ne fait pas un simple update car stockProductsData provient de valuechanges et a récupéré toutes les données
      //console.log('stockOrder mis à jour.');
    })
  }

  removeInStockProducts(productsToRemove:string[], orderId:string) {
    //console.log("removeInStockProducts - productsToRemove : ", productsToRemove);
    productsToRemove.forEach(productId=> {
      let path = 'stockProducts/';
      let productsDoc = this.db.doc<Product>('products/' + productId).valueChanges();
      let productsDocSubscription  = productsDoc.subscribe(productsData=> {
        productsDocSubscription.unsubscribe();
        productsData.type === ProductType.rental ? path = 'stockProducts/' : path = 'stockProducts-longRental/';
        let stockProductsDoc = this.db.doc<StockProducts>(path + productId).valueChanges();
        let stockProductsDocSubscription  = stockProductsDoc.subscribe(stockProductsData=> {
          stockProductsDocSubscription.unsubscribe();
          //console.log("stockProductsData before some and splice", stockProductsData);
          for (let i= 0; i<stockProductsData.immoDates.length; i++) {
            if (stockProductsData.immoDates[i].orderId == orderId) {
              stockProductsData.immoDates.splice(i,1);
              //console.log("stockProductsData after some and splice", stockProductsData);
              this.db.doc<StockProducts>(path + productId).set(stockProductsData).then(()=> { // on ne fait pas un simple update car stockProductsData provient de valuechanges et a récupéré toutes les données
                //console.log('stock Product mis à jour.');
              });
              break;
            }
          }
        })
      });
      })
    }
}
