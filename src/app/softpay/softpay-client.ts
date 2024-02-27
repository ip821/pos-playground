import {Injectable} from "@angular/core";

declare var Softpay: any;

export enum Failure {
  UNKNOWN_ERROR = 1,
  UNSUPPORTED = 200,
  INVALID_USAGE = 310,
  INVALID_ARGUMENT = 320,
  SOFTPAY_NO_APP = 400,
  ABORTED = 800,
  ABORTED_BY_CLIENT = 810,
  REQUEST_FAILED = 950,
}

@Injectable({providedIn: "root"})
export class SoftpayClient {

  public processAppId() {
    const promise = new Promise<string>((resolve, reject) => {
      const client = this.create((response, failure) => {
        resolve(response.appId);
      });
      client.processAppId();
    });
    return promise;
  }

  public processPending(requestId: string): Promise<Failure> {
    const promise = new Promise<Failure>((resolve, reject) => {
      const client = this.create((_, failure) => {
        resolve(failure);
      });
      client.processPending(requestId);
    });
    return promise;
  }

  private create(onResponse: (response:any, failure: any) => void) {
    const environment = "sandbox";
    const pwa = null;
    const callback = '#';
    const fallback = void 0;
    const options: any = {
      env: {env: environment, pwa: pwa, appId: () => undefined},
      callback: callback,
      fallback: fallback,
      namespaced: false,
      log: true
    };
    options.onResponse = (client: any, response: any, failure: any, params: any) => {
      console.log(response);
      console.log(failure);
      client.log(`Response callback: ${response} -> (${failure ?? 'no failure available'}, ${params ?? 'no params available'})`)
      onResponse(response, failure);
    }

    return Softpay.newClient(options)
  }
}
