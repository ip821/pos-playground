import {Component, Input} from "@angular/core";
import {TProduct} from "./product";
import {ProductComponent} from "./product.component";
import {NgForOf} from "@angular/common";

@Component({
  selector: "ip-products-grid",
  standalone: true,
  imports: [
    ProductComponent,
    NgForOf
  ],
  templateUrl: "./product-grid.component.html"
})
export class ProductGridComponent {

  @Input() public products: TProduct[] = [];

  public getTotal() {
    return this.products
      .map(it => it.price)
      .reduce((price, total) => total + price);
  }
}
