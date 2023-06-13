import { KeycloakInstance } from "keycloak-js";
import ApplicationRoles from "./application-roles";

/**
 * Auth utils
 */
export namespace AuthUtils {
  /**
   * Check if user can view contacts
   *
   * @param keycloak keycloak instance
   */
  export const canViewContacts = (keycloak?: KeycloakInstance) => {
    return !!(
      keycloak?.hasRealmRole(ApplicationRoles.LIST_ALL_CONTACTS) &&
      keycloak?.hasRealmRole(ApplicationRoles.UPDATE_OTHER_CONTACTS)
    );
  }

  /**
   * Check if user can manage contacts
   *
   * @param keycloak keycloak instance
   */
  export const canManageContacts = (keycloak?: KeycloakInstance) => {
    return !!keycloak?.hasRealmRole(ApplicationRoles.UPDATE_OTHER_CONTACTS);
  }
}