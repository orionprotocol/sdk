import fetchWithValidation from '../../fetchWithValidation';
import distinctAnalyticsSchema from './schemas/distinctAnalyticsSchema';
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

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.getLink = this.getLink.bind(this);
    this.getSubscribersList = this.getSubscribersList.bind(this);
    this.createReferralLink = this.createReferralLink.bind(this);
    this.subscribeToReferral = this.subscribeToReferral.bind(this);
  }

  getLink = (refererAddress: string) => fetchWithValidation(`${this.apiUrl}/view/link`, linkSchema, {
    headers: {
      referer_address: refererAddress,
    },
  });

  getSubscribersList = (refererAddress: string) => fetchWithValidation(
    `${this.apiUrl}/view/distinct-analytics`,
    distinctAnalyticsSchema,
    {
      headers: {
        referer_address: refererAddress,
      },
    },
  );

  createReferralLink = (payload: CreateLinkPayloadType, signature: SignatureType) => fetchWithValidation(
    `${this.apiUrl}/create`,
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
    `${this.apiUrl}/subscribe`,
    linkSchema,
    {
      headers: {
        'Content-type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ payload, signature }),
    },
  );
}

export * as schemas from './schemas';
export { ReferralSystem };
