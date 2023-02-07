import { z } from 'zod';
import fetchWithValidation from '../../fetchWithValidation';
import { errorSchema, miniStatsSchema, rewardsMappingSchema } from './schemas';
import distinctAnalyticsSchema from './schemas/distinctAnalyticsSchema';
import globalAnalyticsSchema from './schemas/globalAnalyticsSchema';
import linkSchema from './schemas/linkSchema';

type CreateLinkPayloadType = {
  referer: string;
  link_option: number;
};

type SubscribePayloadType = {
  ref_target: string;
  referral: string;
}

type SignatureType = {
  signature: string;
};

class ReferralSystem {
  private apiUrl: string;

  get api() {
    return this.apiUrl;
  }

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.getLink = this.getLink.bind(this);
    this.getDistinctAnalytics = this.getDistinctAnalytics.bind(this);
    this.createReferralLink = this.createReferralLink.bind(this);
    this.subscribeToReferral = this.subscribeToReferral.bind(this);
    this.getMyReferral = this.getMyReferral.bind(this);
  }

  getLink = (refererAddress: string) => fetchWithValidation(`${this.apiUrl}/referer/view/link`, linkSchema, {
    headers: {
      'referer-address': refererAddress,
    },
  });

  getMyReferral = (myWalletAddress: string) => fetchWithValidation(
    `${this.apiUrl}/referral/view/link`,
    linkSchema,
    {
      headers: {
        referral: myWalletAddress,
      },
    },
  );

  getDistinctAnalytics = (refererAddress: string) => fetchWithValidation(
    `${this.apiUrl}/referer/view/distinct-analytics`,
    distinctAnalyticsSchema,
    {
      headers: {
        'referer-address': refererAddress,
      },
    },
    errorSchema,
  );

  getGlobalAnalytics = () => fetchWithValidation(
    `${this.apiUrl}/referer/view/global-analytics`,
    globalAnalyticsSchema,
  );

  /**
   * @param refererAddress Address without 0x prefix
   */
  getMiniStats = (refererAddress: string) => fetchWithValidation(
    `${this.apiUrl}/referer/view/mini-latest-stats`,
    miniStatsSchema,
    {
      headers: {
        'referer-address': refererAddress,
      },
    },
    z.object({
      status: z.string(),
      message: z.string(),
    }),
  );

  getRewardsMapping = (referralAddress: string) => fetchWithValidation(
    `${this.apiUrl}/referer/view/rewards-mapping`,
    rewardsMappingSchema,
    {
      headers: {
        referral: referralAddress,
      },
    },
  );

  createReferralLink = (payload: CreateLinkPayloadType, signature: SignatureType) => fetchWithValidation(
    `${this.apiUrl}/referer/create`,
    linkSchema,
    {
      headers: {
        'Content-type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ payload, signature }),
    },
  );

  subscribeToReferral = (payload: SubscribePayloadType, signature: SignatureType) => fetchWithValidation(
    `${this.apiUrl}/referer/subscribe`,
    linkSchema,
    {
      headers: {
        'Content-type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ payload, signature }),
    },
    errorSchema,
  );
}

export * as schemas from './schemas';
export { ReferralSystem };
