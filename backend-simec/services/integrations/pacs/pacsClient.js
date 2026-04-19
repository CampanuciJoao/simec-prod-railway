import axios from 'axios';

function readEnv(name, fallback = null) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function buildHeaders(apiKey) {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export class PacsClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || readEnv('PACS_API_URL');
    this.apiKey = config.apiKey || readEnv('PACS_API_KEY');
    this.timeout = config.timeout || 15000;
  }

  isConfigured() {
    return !!this.baseUrl;
  }

  async getStudyByAccessionNumber(accessionNumber, extraParams = {}) {
    if (!this.isConfigured()) {
      throw new Error('PACS_NOT_CONFIGURED');
    }

    const response = await axios.get(`${this.baseUrl}/studies`, {
      params: {
        accessionNumber,
        ...extraParams,
      },
      headers: buildHeaders(this.apiKey),
      timeout: this.timeout,
    });

    return response.data;
  }

  async getStudyByPatient(patientId, extraParams = {}) {
    if (!this.isConfigured()) {
      throw new Error('PACS_NOT_CONFIGURED');
    }

    const response = await axios.get(
      `${this.baseUrl}/patients/${patientId}/studies`,
      {
        params: extraParams,
        headers: buildHeaders(this.apiKey),
        timeout: this.timeout,
      }
    );

    return response.data;
  }
}

export function createPacsClient(config) {
  return new PacsClient(config);
}
