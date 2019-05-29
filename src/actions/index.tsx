import * as constants from '../constants'
import { KeycloakInstance } from 'keycloak-js';
import { DeliveriesState, ChatWindow } from 'src/types';
import { Unread } from 'pakkasmarja-client';

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

/**
 * Unreads update
 */
export interface UnreadsUpdate {
  type: constants.UNREADS_UPDATE,
  unreads: Unread[]
}

/**
 * Unread removed
 */
export interface UnreadRemoved {
  type: constants.UNREAD_REMOVED,
  unread: Unread
}

export type AppAction = UserLogin | UserLogout | DeliveriesLoaded | ChatOpen | ChatClose | UnreadsUpdate | UnreadRemoved;

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

export function unreadsUpdate(unreads: Unread[]): UnreadsUpdate {
  return {
    type: constants.UNREADS_UPDATE,
    unreads: unreads
  }
}

export function unreadRemoved(unread: Unread): UnreadRemoved {
  return {
    type: constants.UNREAD_REMOVED,
    unread: unread
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