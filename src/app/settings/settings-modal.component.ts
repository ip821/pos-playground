import {Component, ViewChild} from "@angular/core";
import {FormsModule, NgForm} from "@angular/forms";
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";
import {PaymentSettings, PaymentSettingsService} from "./payment-settings.service";

@Component({
  standalone: true,
  selector: "ip-settings",
  imports: [
    FormsModule
  ],
  templateUrl: "./settings-modal.component.html"
})
export class SettingsModalComponent {

  constructor(
    protected readonly activeModal: NgbActiveModal,
    private readonly paymentSettingsService: PaymentSettingsService,
  ) {
  }

  public paymentSettings: PaymentSettings = this.paymentSettingsService.getPaymentSettings();

  private isFormValid = true;

  onSubmit(form: NgForm) {
    this.isFormValid = !!form.valid;

    if (this.isFormValid) {
      this.paymentSettingsService.setPaymentSettings(this.paymentSettings);
      this.activeModal.close();
    }
  }

  wasFormValidated() {
    return !this.isFormValid;
  }
}
