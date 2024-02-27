import {Component} from '@angular/core';

import {NgbActiveModal, NgbDatepickerModule} from '@ng-bootstrap/ng-bootstrap';
import {FormsModule, NgForm} from "@angular/forms";
import {PaymentSettingsService} from "../settings/payment-settings.service";

@Component({
  selector: 'ip-payment-modal',
  standalone: true,
  imports: [NgbDatepickerModule, FormsModule],
  templateUrl: './payment-modal.component.html',
})
export class PaymentModalComponent {

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly paymentSettingsService: PaymentSettingsService,
  ) {
  }

  public amount?: number = undefined;
  private isFormValid = true;

  onSubmit(form: NgForm) {
    this.isFormValid = !!form.valid;
    if (this.isFormValid) {
      this.activeModal.close();
    }
  }

  wasFormValidated() {
    return !this.isFormValid;
  }
}
