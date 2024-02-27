import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterOutlet} from '@angular/router';
import {NgbModal, NgbModule} from "@ng-bootstrap/ng-bootstrap";

import {ProductGridComponent} from "./products/product-grid.component";
import {TProduct} from "./products/product";
import printJS from "print-js";
import {PaymentModalComponent} from "./payment/payment-modal.component";
import {SettingsModalComponent} from "./settings/settings-modal.component";
import {firstValueFrom} from "rxjs";
import {TransactionStatusComponent} from "./transaction/transaction-status.component";

@Component({
  selector: 'ip-app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NgbModule, ProductGridComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'ng-playground';

  constructor(
    private readonly modal: NgbModal
  ) {
  }

  public readonly products: TProduct[] = [
    {displayName: "Lays 20g", price: 10},
    {displayName: "Jim Beam 500ml", price: 59},
    {displayName: "Jack Daniels 500ml", price: 69},
  ];

  onPrintClicked() {
    printJS("receipt-div", "html");
  }

  async onPayClicked() {
    const paymentModal = this.modal.open(PaymentModalComponent);
    const paymentResult = await firstValueFrom(paymentModal.closed, {defaultValue: undefined});

    if (paymentResult) {
      const transactionModal = this.modal.open(TransactionStatusComponent);
      transactionModal.componentInstance.paymentResult = paymentResult;
    }
  }

  onSettingsClick() {
    this.modal.open(SettingsModalComponent);
  }
}
