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
import contractsAddressesSchema from './schemas/contractsAddressesSchema.js';

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
    this.getContractsAddresses = this.getContractsAddresses.bind(this);
    this.getClaimInfo = this.getClaimInfo.bind(this);
    this.getAggregatedHistory = this.getAggregatedHistory.bind(this);
  }

  getLink = (refererAddress: string) =>
    fetchWithValidation(`${this.apiUrl}/referer/view/link`, linkSchema, {
      headers: {
        'referer-address': refererAddress,
      },
    });

  getMyReferral = (myWalletAddress: string) =>
    fetchWithValidation(`${this.apiUrl}/referral/view/link`, linkSchema, {
      headers: {
        referral: myWalletAddress,
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
    payload: CreateLinkPayloadType
  ) =>
    fetchWithValidation(`${this.apiUrl}/referer/create2`, linkSchema, {
      headers: {
        'Content-type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(payload),
    });

  subscribeToReferral = (
    payload: SubscribePayloadType
  ) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/subscribe2`,
      linkSchema,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(payload),
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

  getContractsAddresses = () =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/contracts`,
      contractsAddressesSchema,
      undefined,
      errorSchema
    );

  getClaimInfo = (refererAddress: string) =>
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

  getAggregatedHistory = (
    refererAddress: string,
    chainId: SupportedChainId | undefined,
    types: string[] | undefined,
    itemPerPage: number,
    page: number
  ) => {
    const queryParams: Record<string, string | number> = {
      n_per_page: itemPerPage,
      page,
      suppress_error: 1
    };

    if (chainId !== undefined) {
      queryParams['chain_id'] = chainId;
    }

    if (types !== undefined) {
      queryParams['history_filter'] = encodeURIComponent(types.join(','));
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
