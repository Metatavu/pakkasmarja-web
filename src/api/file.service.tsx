/**
 * Interface describing file upload response
 */
export interface FileResponse {
  url: string
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
} 
