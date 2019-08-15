/**
 * Class for PDF service
 */
export class PDFService {

  private basePath: string;
  private token: string;

  /**
   * Constructor
   * 
   * @param basePath basePath 
   * @param token token
   */
  constructor(basePath: string, token: string) {
    this.basePath = basePath;
    this.token = token;
  }

  /**
   * Get pdf
   * 
   * @param contractId contractId
   * @param type type
   * @return pdf blob
   */
  public getPdf = async (contractId: string, type: string) => {
    const url = `${this.basePath}/rest/v1/contracts/${contractId}/documents/${type}?format=PDF`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return response; 
  }

  /**
   * Get html
   * 
   * @param contractId contractId
   * @param type type
   * @return html blob
   */
  public getHtml = async (contractId: string, type: string) => {
    const url = `${this.basePath}/rest/v1/contracts/${contractId}/documents/${type}?format=HTML`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return response; 
  }

  /**
   * Get pdf
   * 
   * @param reportType reportType
   * @param startDate startDate
   * @param endDate endDate
   * @param productIds productIds
   * @return pdf blob
   */
  public getDeliveryPdf = async (reportType: string, startDate: string, endDate: string, productIds: string[]) => {
    const url = `${this.basePath}/rest/v1/reports/${reportType}/?format=PDF&startDate=${startDate}&endDate=${endDate}&productIds=${productIds}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return response; 
  }
}