import * as constants from '../constants'
import { KeycloakInstance } from 'keycloak-js';
import { DeliveriesState } from 'src/types';

export interface UserLogin {
  type: constants.USER_LOGIN;
  keycloak?: KeycloakInstance;
  authenticated: boolean;
}

export interface UserLogout {
  type: constants.USER_LOGOUT;
}

/**
 * Deliveries loaded
 */
export interface DeliveriesLoaded {
  type: constants.DELIVERIES_LOADED,
  deliveries: DeliveriesState
}

export type AppAction = UserLogin | UserLogout | DeliveriesLoaded;

export function userLogin(keycloak: KeycloakInstance, authenticated: boolean): UserLogin {
  return {
    type: constants.USER_LOGIN,
    keycloak: keycloak,
    authenticated: authenticated
  }
}

export function userLogout(): UserLogout {
  return {
    type: constants.USER_LOGOUT
  }
}

/**
 * Store method for deliveries
 * 
 * @param deliveries deliveries
 */
export function deliveriesLoaded(deliveries: DeliveriesState): DeliveriesLoaded {
  return {
    type: constants.DELIVERIES_LOADED,
    deliveries: deliveries
  }
}