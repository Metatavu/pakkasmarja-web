import LocalizedStrings, { 
  LocalizedStringsMethods
} from 'localized-strings';

export interface IStrings extends LocalizedStringsMethods {
  menuBarUserItemText: string
  menuBarManageAccountText: string
  menuBarLogoutText: string
  welcomeLoginButtonText: string
  siteHeader: string
  news: string
  deliveries: string
  contracts: string
  operations: string
  frozenContracts: string
  freshContracts: string
  contractQuantity: string
  deliveredQuantity: string
  welcome: string
  redirectingTokeycloak: string
}

const strings: IStrings = new LocalizedStrings({
  en: require("./en.json")
});

export default strings;