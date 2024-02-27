import {Injectable} from "@angular/core";

export type PaymentSettings = {
  clientId: string;
  secret: string;
  appId: string;
};

@Injectable({providedIn: "root"})
export class PaymentSettingsService {

  private readonly keyClientId = "payment.clientId";
  private readonly keySecret = "payment.secret";
  private readonly keyAppId = "payment.appId";

  getPaymentSettings(): PaymentSettings {
    const clientId = localStorage.getItem(this.keyClientId) ?? "";
    const secret = localStorage.getItem(this.keySecret) ?? "";
    const appId = localStorage.getItem(this.keyAppId) ?? "";

    return {clientId, secret, appId};
  }

  setPaymentSettings(paymentSettings: PaymentSettings) {
    const {clientId, secret, appId} = paymentSettings;
    localStorage.setItem(this.keyClientId, clientId);
    localStorage.setItem(this.keySecret, secret);
    localStorage.setItem(this.keyAppId, appId);
  }
}
