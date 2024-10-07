import {Component, OnInit} from '@angular/core';

import {NgbActiveModal, NgbDatepickerModule} from '@ng-bootstrap/ng-bootstrap';
import {FormsModule, NgForm} from "@angular/forms";
import {PaymentSettings, PaymentSettingsService} from "../settings/payment-settings.service";
import {SoftpayAuthService} from "../softpay/softpay-auth.service";
import {SoftpayApi} from "../softpay/api";
import {Failure, SoftpayClient} from "../softpay/softpay-client";
import {InputFocusDirective} from "../input-focus.directive";
import {NgIf} from "@angular/common";

export type PaymentModalComponentResult = {
  requestId: string;
  merchantRef: string;
  failure?: Failure;
  amount: number;
};

@Component({
  selector: 'ip-payment-modal',
  standalone: true,
  imports: [NgbDatepickerModule, FormsModule, InputFocusDirective, NgIf],
  templateUrl: './payment-modal.component.html',
})
export class PaymentModalComponent implements OnInit {

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly paymentSettingsService: PaymentSettingsService,
    private readonly softpayAuth: SoftpayAuthService,
    private readonly softpayApi: SoftpayApi,
    private readonly softpayClient: SoftpayClient,
  ) {
  }

  public amount?: number = undefined;
  public errorMessage?: string;
  public appId!: string;
  public paymentSettings!: PaymentSettings;
  public isLoading = false;
  private isFormValid = true;

  async ngOnInit(): Promise<void> {
    this.paymentSettings = this.paymentSettingsService.getPaymentSettings();
    let appId = this.paymentSettings.appId;
    if (!appId) {
      appId = await this.softpayClient.processAppId();
    }
    this.appId = appId;
  }

  async onSubmit(form: NgForm) {
    this.isFormValid = !!form.valid;
    if (this.isFormValid) {
      const result = await this.makePayment(this.amount!);
      if (result)
        this.activeModal.close(result);
    }
  }

  private async makePayment(amount: number): Promise<PaymentModalComponentResult | undefined> {
    this.errorMessage = "";
    this.isLoading = true;
    try {
      const {clientId, secret} = this.paymentSettings;
      const accessToken = await this.softpayAuth.getAccessToken(clientId, secret);
      const merchants = await this.softpayApi.getMerchants(accessToken);

      const merchant = merchants.first();
      console.log(merchant);
      //
      // const request = await this.softpayApi.createRequest(accessToken, merchant.merchantReference, "PAYMENT");
      // console.log(request);
      //
      // await this.softpayApi.startTransaction(
      //   accessToken,
      //   merchant.merchantReference,
      //   request.requestId, {
      //     amount: (amount * 100).toString(),
      //     appId: this.appId,
      //     currencyCode: "DKK"
      //   });

      // const failure = await this.softpayClient.processPending(request.requestId)
      // console.log(failure);

      return {
        requestId: "a1",
        // requestId: request.requestId,
         merchantRef: merchant.merchantReference,
        amount
        //failure
      };
    } catch (e: any) {
      this.errorMessage = e.error.message ?? "Unknown error";
    } finally {
      this.isLoading = false;
    }

    return undefined;
  }

  wasFormValidated() {
    return !this.isFormValid;
  }
}
