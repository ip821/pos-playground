import {HttpClient} from "@angular/common/http";
import {firstValueFrom, Observable} from 'rxjs';
import {Injectable} from "@angular/core";

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type MerchantRef = {
  name: string;
  businessRegistrationNumber: string;
  merchantReference: string;
};

export type RequestType = "PAYMENT" | "REFUND";

export type CreateRequestResponse = {
  requestId: string;
  expiresAt: string;
};

export type Transaction = {
  requestId: string;
  state: string;
  type: string;
};

export type StartTransactionRequest = {
  requestId: string;
  appId: string;
  amount: number;
  currencyCode: string;
};

@Injectable({providedIn: "root"})
export class SoftpayApi {

  private readonly softpayUrl = "https://api.sandbox.softpay.io";

  constructor(private readonly httpClient: HttpClient) {
  }

  public token(clientId: string, secret: string) {
    const result$: any = this.httpClient.post(
      "https://auth.sandbox.softpay.io" + "/oauth2/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Authorization": "Basic " + btoa(clientId + ":" + secret),
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    return firstValueFrom<TokenResponse>(result$);
  }

  public getMerchants(accessToken: string): Promise<MerchantRef[]> {
    const result$: any = this.httpClient.get(
      this.softpayUrl + "/api-gateway/v1/api/cloud/merchants", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    return firstValueFrom(result$);
  }

  async createRequest(accessToken: string, requestType: RequestType): Promise<CreateRequestResponse> {
    const result$: any = this.httpClient.post(
      this.softpayUrl + "/api-gateway/v2/api/cloud/transactions",
      `{"action":"${requestType}"}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    return firstValueFrom(result$);
  }

  async getTransaction(accessToken: string, requestId: string): Promise<Transaction> {
    const result$: any = this.httpClient.get(
      this.softpayUrl + "/api-gateway/v2/api/cloud/transactions/" + requestId, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    return firstValueFrom(result$);
  }

  async startTransaction(accessToken: string, request: StartTransactionRequest): Promise<any> {
    const result$: any = this.httpClient.put(
      this.softpayUrl + "/api-gateway/v2/api/cloud/transactions/" + request.requestId,
      JSON.stringify(request), {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    return firstValueFrom(result$);
  }
}
