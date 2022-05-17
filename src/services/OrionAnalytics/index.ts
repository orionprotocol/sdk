import fetchWithValidation from '../../fetchWithValidation';
import overviewSchema from './schemas/overviewSchema';

export default class OrionAnalytics {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.getOverview = this.getOverview.bind(this);
  }

  getOverview = () => fetchWithValidation(
    `${this.apiUrl}/api/stats/overview`,
    overviewSchema,
  );
}
