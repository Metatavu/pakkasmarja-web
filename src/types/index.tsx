import { KeycloakInstance } from "keycloak-js";
import { Contract, ItemGroup, AreaDetail, Delivery, Product, WeekDeliveryPrediction, Contact, DeliveryPlace, ItemGroupDocumentTemplate } from "pakkasmarja-client";

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

/*
 * Type for delivery data value 
 */
export type DeliveryDataValue = undefined | string | number | boolean | (string | number | boolean)[] | Date;

/**
 * Interface for product options
 */
export interface Options {
  key: string | undefined,
  text: string | undefined,
  value: string | undefined
}

/**
 * Interface for FilterContracts
 */
export interface FilterContracts {
  itemGroupId?: string;
  status?: Contract.StatusEnum;
  year?: number;
  listAll?: string;
  firstResult?: number;
  maxResults?: number;
}

/**
 * Interface for delivery and product
 */
export interface DeliveryProduct {
  delivery: Delivery;
  product?: Product;
}

/**
 * Interface for contract table data
 */
export interface WeekDeliveryPredictionTableData {
  weekDeliveryPrediction: WeekDeliveryPrediction,
  itemGroup: ItemGroup
}

/**
 * Innterface for item group table data
 */
export interface ItemGroupTableData {
  itemGroup: ItemGroup;
  itemGroupTemplates: ItemGroupDocumentTemplate[]
}