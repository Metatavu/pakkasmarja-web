import { AppAction } from '../actions';
import { StoreState, DeliveriesState } from '../types/index';
import { USER_LOGIN, USER_LOGOUT, DELIVERIES_LOADED, CHAT_OPEN, CHAT_CLOSE, UNREADS_UPDATE, UNREAD_REMOVED } from '../constants/index';

export function processAction(state: StoreState, action: AppAction): StoreState {
  switch (action.type) {
    case USER_LOGIN:
      return { ...state, keycloak: action.keycloak, authenticated: action.authenticated };
    case USER_LOGOUT:
      return { ...state, keycloak: undefined, authenticated: false };
    case DELIVERIES_LOADED:
      const deliveries : DeliveriesState = action.deliveries;
      return { ...state, deliveries: deliveries };
    case CHAT_OPEN:
      return { ...state, openChats: [...state.openChats, action.chat] };
    case CHAT_CLOSE:
      return { ...state, openChats: state.openChats.filter((chat) => chat.threadId !== action.chat.threadId)};
    case UNREADS_UPDATE:
      return { ...state, unreads: action.unreads }
    case UNREAD_REMOVED:
      return { ...state, unreads: state.unreads.filter((unread) => unread.id !== action.unread.id )};
  }
  return state;
}