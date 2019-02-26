import { KeycloakInstance } from "keycloak-js";

export interface StoreState {
  keycloak?: KeycloakInstance,
  authenticated: boolean
}