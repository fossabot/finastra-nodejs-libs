import { PassportStrategy } from '@nestjs/passport';
import { Strategy, TokenSet } from 'openid-client';
import { getUserInfo, authenticateExternalIdps } from '../utils';
import { ChannelType, OidcUser } from '../interfaces';
import { OidcService } from '../services';

export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  userInfoCallback: any;
  constructor(private oidcService: OidcService, private idpKey: string, private channelType?: ChannelType) {
    super({
      client: oidcService.idpInfos[idpKey].client,
      params: oidcService.options.authParams,
      passReqToCallback: false,
      usePKCE: oidcService.options.usePKCE,
    });
    this.userInfoCallback = oidcService.options.userInfoCallback;
  }

  async validate(tokenset: TokenSet): Promise<OidcUser> {
    const externalIdps = await authenticateExternalIdps(this.oidcService.options.externalIdps);
    const id_token = tokenset.id_token;
    let userinfo = await getUserInfo(id_token, this.oidcService, this.idpKey);
    userinfo['channel'] = this.channelType;

    const expiresAt =
      Number(tokenset.expires_at) ||
      (Number(tokenset.expires_in) ? Date.now() / 1000 + Number(tokenset.expires_in) : null);
    const authTokens = {
      accessToken: tokenset.access_token,
      refreshToken: tokenset.refresh_token,
      tokenEndpoint: this.oidcService.idpInfos[this.idpKey].trustIssuer.metadata.token_endpoint,
      expiresAt,
    };
    const user: OidcUser = {
      id_token,
      userinfo,
      authTokens,
      ...externalIdps,
    };
    return user;
  }
}
