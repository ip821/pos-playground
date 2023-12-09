import {Component, Input} from "@angular/core";
import {TProduct} from "./product";

@Component({
  selector: "ip-product",
  standalone: true,
  templateUrl: "./product.component.html"
})
export class ProductComponent {

  @Input() public index?: number;
  @Input() public product?: TProduct;
}
