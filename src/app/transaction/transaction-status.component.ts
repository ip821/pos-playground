import {Component, OnInit} from "@angular/core";
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";
import {SoftpayAuthService} from "../softpay/softpay-auth.service";
import {SoftpayApi, Transaction} from "../softpay/api";
import {PaymentSettingsService} from "../settings/payment-settings.service";
import {PaymentModalComponentResult} from "../payment/payment-modal.component";
import {NgIf} from "@angular/common";

@Component({
  selector: "ip-transaction-status",
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: "./transaction-status.component.html"
})
export class TransactionStatusComponent implements OnInit {

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly paymentSettingsService: PaymentSettingsService,
    private readonly softpayAuthService: SoftpayAuthService,
    private readonly softpayApi: SoftpayApi,
  ) {
  }

  public paymentResult?: PaymentModalComponentResult;
  private transaction?: Transaction;

  async ngOnInit(): Promise<void> {
    const paymentSettings = this.paymentSettingsService.getPaymentSettings();
    const accessToken = await this.softpayAuthService.getAccessToken(paymentSettings.clientId, paymentSettings.secret);
    this.transaction = await this.softpayApi.getTransaction(
      accessToken,
      this.paymentResult!.merchantRef,
      this.paymentResult!.requestId
    );
  }

  getRequestId() {
    return this.paymentResult?.requestId;
  }

  getState() {
    return this.transaction?.state;
  }

  getFailure() {
    return this.paymentResult?.failure;
  }
}
