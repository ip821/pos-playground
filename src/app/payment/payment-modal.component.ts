import {Component} from '@angular/core';

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
};

@Component({
  selector: 'ip-payment-modal',
  standalone: true,
  imports: [NgbDatepickerModule, FormsModule, InputFocusDirective, NgIf],
  templateUrl: './payment-modal.component.html',
})
export class PaymentModalComponent {

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly paymentSettingsService: PaymentSettingsService,
    private readonly softpayAuth: SoftpayAuthService,
    private readonly softpayApi: SoftpayApi,
    private readonly softpayClient: SoftpayClient,
  ) {
  }

  public amount?: number = undefined;
  private isFormValid = true;
  public errorMessage?: string;
  public appId?: string;

  async onSubmit(form: NgForm) {
    this.isFormValid = !!form.valid;
    if (this.isFormValid) {
      const result = await this.makePayment(this.paymentSettingsService.getPaymentSettings());
      if (result)
        this.activeModal.close(result);
    }
  }

  private async makePayment(paymentSettings: PaymentSettings): Promise<PaymentModalComponentResult | undefined> {
    this.errorMessage = "";
    try {
      const accessToken = await this.softpayAuth.getAccessToken(paymentSettings.clientId, paymentSettings.secret);
      const merchants = await this.softpayApi.getMerchants(accessToken);

      const merchant = merchants.first();
      console.log(merchant);

      const request = await this.softpayApi.createRequest(accessToken, merchant.merchantReference, "PAYMENT");
      console.log(request);

      let appId = paymentSettings.appId;
      if (!appId) {
        appId = await this.softpayClient.processAppId();
      }
      this.appId = appId;
      console.log(appId);

      await this.softpayApi.startTransaction(
        accessToken,
        merchant.merchantReference,
        request.requestId, {
          amount: (this.amount! * 100).toString(),
          appId: appId,
          currencyCode: "DKK"
        });

      const failure = await this.softpayClient.processPending(request.requestId)
      console.log(failure);

      return {
        requestId: request.requestId,
        merchantRef: merchant.merchantReference,
        failure
      };
    } catch (e: any) {
      this.errorMessage = e.error.message ?? "Unknown error";
    }

    return undefined;
  }

  wasFormValidated() {
    return !this.isFormValid;
  }
}
