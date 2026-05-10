/**
 * Shared helper for parsing API responses safely.
 */
class PCWApiResponseParser {
  /**
   * Parse a fetch response as JSON and provide a useful error for empty responses.
   *
   * @param {Response} response
   * @param {string} label
   * @returns {Promise<Object>}
   */
  static async parse(response, label = 'API') {
    const text = await response.text();
    if (!text.trim()) {
      throw new Error(`${label} returned an empty response. Check PHP errors or server logs.`);
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`${label} returned invalid JSON: ${text.slice(0, 300)}`);
    }
  }
}

window.PCWApiResponseParser = PCWApiResponseParser;
