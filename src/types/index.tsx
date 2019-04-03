import { KeycloakInstance } from "keycloak-js";
import { Contract, ItemGroup, AreaDetail, Contact, DeliveryPlace } from "pakkasmarja-client";

export interface StoreState {
  keycloak?: KeycloakInstance,
  authenticated: boolean
}

/**
 * Interface for contract table data
 */
export interface ContractTableData {
  contract: Contract,
  itemGroup?: ItemGroup
}

/**
 * Interface for contract data
 */
export interface ContractData {
  rejectComment: string,
  proposedQuantity: number,
  deliverAllChecked: boolean,
  quantityComment: string,
  areaDetailValues: AreaDetail[],
  deliveryPlaceId: string,
  deliveryPlaceComment: string
}

/**
 * Type for contract data key
 */
export type ContractDataKey = "rejectComment" | "proposedQuantity" | "deliverAllChecked" | "quantityComment" | "areaDetailValues" | "deliveryPlaceId" | "deliveryPlaceComment";

/**
 * Interface for http response if something is not right
 */
export interface HttpErrorResponse {
  code: number,
  message: string
}

/**
 * Interface for contract management table data
 */
export interface ContractManagementTableData {
  contract: Contract;
  itemGroup?: ItemGroup;
  contact?: Contact;
  deliveryPlace?: DeliveryPlace;
}