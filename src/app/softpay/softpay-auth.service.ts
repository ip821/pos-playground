import {Injectable} from "@angular/core";
import {SoftpayApi, TokenResponse} from "./api";

type SavedAccessToken = {
  when: string;
  response: TokenResponse;
};

@Injectable({providedIn: "root"})
export class SoftpayAuthService {

  constructor(private readonly softpayApi: SoftpayApi) {
  }

  private readonly keyAccessTokenObject = "access_token_object";

  public async getAccessToken(clientId: string, secret: string): Promise<string> {
    const savedText = localStorage.getItem(this.keyAccessTokenObject) ?? "";

    let savedToken: SavedAccessToken = savedText ? JSON.parse(savedText) : undefined;

    const now = new Date();

    if (
      !savedToken
      || new Date(savedToken.when).addSeconds(savedToken.response.expires_in) <= now
    ) {
      console.log("Refreshing token...");
      const response = await this.softpayApi.token(clientId, secret);
      savedToken = {when: now.toJSON(), response};
      localStorage.setItem(this.keyAccessTokenObject, JSON.stringify(savedToken));
    }
    console.log(savedToken);
    return savedToken.response.access_token;
  }
}
