import fetchWithValidation from '../../fetchWithValidation';
import overviewSchema from './schemas/overviewSchema';

export default class OrionAnalytics {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.getOverview = this.getOverview.bind(this);
  }

  get api() {
    return this.apiUrl;
  }

  getOverview = () => fetchWithValidation(
    `${this.apiUrl}/overview`,
    overviewSchema,
  );
}
