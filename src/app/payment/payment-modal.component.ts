import {Component} from '@angular/core';

import {NgbActiveModal, NgbDatepickerModule} from '@ng-bootstrap/ng-bootstrap';
import {FormsModule, NgForm} from "@angular/forms";
import {PaymentSettings, PaymentSettingsService} from "../settings/payment-settings.service";
import {SoftpayAuthService} from "../softpay/softpay-auth.service";
import {SoftpayApi} from "../softpay/api";
import {Failure, SoftpayClient} from "../softpay/softpay-client.factory";
import {InputFocusDirective} from "../input-focus.directive";

export type PaymentModalComponentResult = {
  requestId: string;
  failure?: Failure;
};

@Component({
  selector: 'ip-payment-modal',
  standalone: true,
  imports: [NgbDatepickerModule, FormsModule, InputFocusDirective],
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

  async onSubmit(form: NgForm) {
    this.isFormValid = !!form.valid;
    if (this.isFormValid) {
      const result = await this.makePayment(this.paymentSettingsService.getPaymentSettings());
      this.activeModal.close(result);
    }
  }

  private async makePayment(paymentSettings: PaymentSettings): Promise<PaymentModalComponentResult> {
    const accessToken = await this.softpayAuth.getAccessToken(paymentSettings.clientId, paymentSettings.secret);
    const merchants = await this.softpayApi.getMerchants(accessToken);

    const merchant = merchants.first();
    console.log(merchant);

    const request = await this.softpayApi.createRequest(accessToken, "PAYMENT");
    console.log(request);

    const failure = await this.softpayClient.processPending(request.requestId)
    console.log(failure);

    return {requestId: request.requestId, failure};
  }

  wasFormValidated() {
    return !this.isFormValid;
  }
}
