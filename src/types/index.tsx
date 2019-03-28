import { KeycloakInstance } from "keycloak-js";
import { Contract, ItemGroup, AreaDetail, Delivery, Product } from "pakkasmarja-client";

export interface StoreState {
  keycloak?: KeycloakInstance,
  authenticated: boolean,
  deliveries?: DeliveriesState,
}

export interface DeliveriesState {
  freshDeliveryData: DeliveryProduct[];
  frozenDeliveryData: DeliveryProduct[];
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
 * Interface for delivery and product
 */
export interface DeliveryProduct {
  delivery: Delivery;
  product?: Product;
}