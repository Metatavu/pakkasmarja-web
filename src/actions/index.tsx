import * as constants from '../constants'
import { KeycloakInstance } from 'keycloak-js';
import { DeliveriesState, ChatWindow } from 'src/types';

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

/**
 * Chat open
 */
export interface ChatOpen {
  type: constants.CHAT_OPEN,
  chat: ChatWindow
}

/**
 * Chat close
 */
export interface ChatClose {
  type: constants.CHAT_CLOSE,
  chat: ChatWindow
}

export type AppAction = UserLogin | UserLogout | DeliveriesLoaded | ChatOpen | ChatClose;

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

export function chatOpen(chat: ChatWindow): ChatOpen {
  return {
    type: constants.CHAT_OPEN,
    chat: chat
  }
}

export function chatClose(chat: ChatWindow): ChatClose {
  return {
    type: constants.CHAT_CLOSE,
    chat: chat
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