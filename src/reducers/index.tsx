import { AppAction } from '../actions';
import { StoreState } from '../types/index';
import { USER_LOGIN, USER_LOGOUT } from '../constants/index';

export function processAction(state: StoreState, action: AppAction): StoreState {
  switch (action.type) {
    case USER_LOGIN:
      return { ...state, keycloak: action.keycloak, authenticated: action.authenticated};
    case USER_LOGOUT:
      return { ...state, keycloak: undefined, authenticated: false };
  }
  return state;
}