import { AppAction } from '../actions';
import { StoreState, DeliveriesState } from '../types/index';
import { USER_LOGIN, USER_LOGOUT, DELIVERIES_LOADED } from '../constants/index';

export function processAction(state: StoreState, action: AppAction): StoreState {
  switch (action.type) {
    case USER_LOGIN:
      return { ...state, keycloak: action.keycloak, authenticated: action.authenticated };
    case USER_LOGOUT:
      return { ...state, keycloak: undefined, authenticated: false };
    case DELIVERIES_LOADED:
      const deliveries : DeliveriesState = action.deliveries;
      return { ...state, deliveries: deliveries };
  }
  return state;
}