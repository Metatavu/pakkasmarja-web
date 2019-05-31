export interface AppConfigDelieryOptions {
  "fresh-delivery-place-id": string
}

export interface AppConfigContractsOptions {
  visible: boolean,
  except: string[]
}

export interface AppConfigItemGroupOptions {
  "require-area-details": boolean
}

export interface AppConfigOptions {
  "delivery": AppConfigDelieryOptions,
  "contracts-question-group": number,
  "contracts": AppConfigContractsOptions,
  "item-groups": { [key: string]: AppConfigItemGroupOptions }
}

/**
 * Singleton class for holding app config
 */
class AppConfig {

  private appConfig: AppConfigOptions;

  /**
   * Gets app config and if its not loaded, loads it from server
   */
  public getAppConfig = async (): Promise<AppConfigOptions> => {
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