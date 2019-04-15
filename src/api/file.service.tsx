/**
 * Interface describing file upload response
 */
export interface FileResponse {
  url: string
}

/**
 * Interface for image base64 response
 */
export interface ImageBase64Response {
  data: string;
}

/**
 * File service
 */
export class FileService {

  private token: string;
  private basePath: string;

  /**
   * Constructor
   * 
   * @param basePath basePath 
   * @param token token 
   */
  constructor(basePath: string, token: string) {
    this.token = token;
    this.basePath = basePath;
  }

  /**
   * Handles file upload
   * 
   * @param file file to upload
   * 
   */
  public uploadFile(file: File): Promise<FileResponse> {

    const data = new FormData();
    data.append("file", file);

    return fetch(`${this.basePath}/upload`, {
      headers: {
        "Authorization": `Bearer ${this.token}`
      },
      method: "POST",
      body: data
    })
    .then((res) => { return res.json() })
    .catch((err) => { console.log(err) });
  }

  /**
   * Get image
   * 
   * @param url file url
   * 
   */
  public async getFile(url: string): Promise<ImageBase64Response> {
    const headers = new Headers({"Authorization": `Bearer ${this.token}`});
    const options = {
      method: 'GET',
      headers: headers
    };
    const request = new Request(url);
  
    return fetch(request, options).then(async (response) => {
      const arrayBuffer: ArrayBuffer = await response.arrayBuffer();

      return {
        data: this.arrayBufferToBase64(arrayBuffer)
      }
    });
  }

  /**
   * Array buffer to base64
   * @param buffer buffer
   */
  private arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = [].slice.call(new Uint8Array(buffer));
    const binaryString = bytes.reduce((acculumator: string, byte: number) => {
      return acculumator + String.fromCharCode(byte)
    }, "");
  
    return window.btoa(binaryString);
  };
} 
