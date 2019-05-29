import { KeycloakInstance } from "keycloak-js";
import { Contract, ItemGroup, AreaDetail, Delivery, Product, WeekDeliveryPrediction, ItemGroupDocumentTemplate, ChatThread, Unread } from "pakkasmarja-client";

export interface StoreState {
  keycloak?: KeycloakInstance,
  authenticated: boolean,
  deliveries?: DeliveriesState,
  openChats: ChatWindow[],
  unreads: Unread[]
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
  value: string | undefined | number
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
 * Interface for time and deliveryproduct
 */
export interface SortedDeliveryProduct {
  time: string;
  deliveryProducts: DeliveryProduct[]
}

/**
 * Interface for delivery note with img base 64
 */
export interface deliveryNoteImg64 {
  id?: string;
  text?: string,
  img64?: string
}

/**
 * Interface representing chat window
 */
export interface ChatWindow {
  open: boolean,
  threadId: number,
  answerType: ChatThread.AnswerTypeEnum
}

/**
 * Interface for sorted week delivery predictions
 */
export interface SortedPredictions {
  week: string;
  WeekDeliveryPredictionTableData: WeekDeliveryPredictionTableData[]
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