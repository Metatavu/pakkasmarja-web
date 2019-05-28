/**
 * Singleton class for holding app config
 */
class AppConfig {

  private appConfig: any;

  /**
   * Gets app config and if its not loaded, loads it from server
   */
  public getAppConfig = async () => {
    if (!this.appConfig) {
      this.appConfig = await this.loadAppConfig();
    }

    return this.appConfig;
  }

  /**
   * Loads app config from server
   */
  private loadAppConfig = async () => {
    const response = await fetch(this.getAppConfigUrl())
    return response.json();
  }

  /**
   * Returns app config url
   */
  private getAppConfigUrl() {
    return `${process.env.REACT_APP_API_URL}/system/app-config.json`;
  }

}

export default new AppConfig();