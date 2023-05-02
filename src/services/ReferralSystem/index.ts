import {fetchWithValidation} from 'simple-typed-fetch';
import {
  errorSchema,
  miniStatsSchema,
  rewardsMappingSchema,
  distinctAnalyticsSchema,
  globalAnalyticsSchema,
  rewardsClaimedSchema,
  linkSchema,
  ratingSchema,
  claimInfoSchema,
  aggregatedHistorySchema,
} from './schemas/index.js';
import {SupportedChainId} from "../../types.js";

type CreateLinkPayloadType = {
  referer: string
  link_option: number
};

type ClaimRewardsPayload = {
  reward_recipient: string
  chain_id: number
};

type SubscribePayloadType = {
  ref_target: string
  referral: string
};

type SignatureType = {
  signature: string
};

class ReferralSystem {
  private readonly apiUrl: string;

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
    this.getGlobalAnalytics = this.getGlobalAnalytics.bind(this);
    this.getMiniStats = this.getMiniStats.bind(this);
    this.getRewardsMapping = this.getRewardsMapping.bind(this);
    this.claimRewards = this.claimRewards.bind(this);
    this.getRating = this.getRating.bind(this);
    this.getRating = this.getRating.bind(this);
    this.getClamInfo = this.getClamInfo.bind(this);
    this.getAggregatedHistory = this.getAggregatedHistory.bind(this);
  }

  getLink = (refererAddress: string) =>
    fetchWithValidation(`${this.apiUrl}/referer/view/link`, linkSchema, {
      headers: {
        'referer-address': refererAddress,
      },
    });

  getMyReferral = (myWalletAddress: string) =>
    fetchWithValidation(`${this.apiUrl}/referer/view/link`, linkSchema, {
      headers: {
        'referer-address': myWalletAddress,
      },
    });

  getDistinctAnalytics = (refererAddress: string) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/distinct-analytics`,
      distinctAnalyticsSchema,
      {
        headers: {
          'referer-address': refererAddress,
        },
      },
      errorSchema
    );

  getGlobalAnalytics = () =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/global-analytics`,
      globalAnalyticsSchema
    );

  /**
   * @param refererAddress Address without 0x prefix
   */
  getMiniStats = (refererAddress: string) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/mini-latest-stats`,
      miniStatsSchema,
      {
        headers: {
          'referer-address': refererAddress,
        },
      },
      errorSchema
    );

  getRewardsMapping = (
    referralAddress: string,
    page = 1,
    positionsPerPage = 10
  ) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/rewards-mapping?n_per_page=${positionsPerPage}&page=${page}`,
      rewardsMappingSchema,
      {
        headers: {
          referral: referralAddress,
        },
      }
    );

  claimRewards = (payload: ClaimRewardsPayload, signature: SignatureType) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/governance/claim-rewards`,
      rewardsClaimedSchema,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({payload, signature}),
      }
    );

  createReferralLink = (
    payload: CreateLinkPayloadType,
    signature: SignatureType
  ) =>
    fetchWithValidation(`${this.apiUrl}/referer/create`, linkSchema, {
      headers: {
        'Content-type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({payload, signature}),
    });

  subscribeToReferral = (
    payload: SubscribePayloadType,
    signature: SignatureType
  ) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/subscribe`,
      linkSchema,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({payload, signature}),
      },
      errorSchema
    );

  getRating = (refererAddress: string | undefined, chainId: SupportedChainId) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/ve/rating-table-leaderboard?chain_id=${chainId}`,
      ratingSchema,
      {
        headers: refererAddress !== undefined ? {'referer-address': refererAddress} : {},
      },
      errorSchema
    );

  getClamInfo = (refererAddress: string) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/claim-info-with-stats?&suppress_error=1`,
      claimInfoSchema,
      {
        headers: {
          'referer-address': refererAddress,
        },
      },
      errorSchema
    );

  getAggregatedHistory = (refererAddress: string, chainId: SupportedChainId | undefined, itemPerPage: number, page: number) => {
    const queryParams: Record<string, string | number> = {
      n_per_page: itemPerPage,
      page,
      suppress_error: 1
    };

    if (chainId !== undefined) {
      queryParams['chain_id'] = chainId;
    }

    const queryString = Object.entries(queryParams).map(([k, v]) => `${k}=${v}`).join('&')

    return fetchWithValidation(
      `${this.apiUrl}/referer/view/aggregated-history?${queryString}`,
      aggregatedHistorySchema,
      {
        headers: {
          'referer-address': refererAddress,
        },
      },
      errorSchema
    );
  }
}

export * as schemas from './schemas/index.js';
export {ReferralSystem};
