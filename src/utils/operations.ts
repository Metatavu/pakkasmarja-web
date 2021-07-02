import { OperationType } from "pakkasmarja-client";

/**
 * Utility class for operations
 */
export class OperationUtils {

  /**
   * Returns operation type display name
   * 
   * @param type operation type
   * @return display name
   */
  static getReportDisplayName(type: OperationType): string {
    switch (type) {
      case "ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES":
        return "Marjalajien oletus sopimusmallit";
      case "SAP_CONTACT_SYNC":
        return "SAP Yhteystietojen synkronointi";
      case "SAP_CONTRACT_SAPID_SYNC":
        return "Synkronoi sopimusten SAP -tunnisteet";
      case "SAP_CONTRACT_SYNC":
        return "SAP sopimusten synkronointi";
      case "SAP_DELIVERY_PLACE_SYNC":
        return "SAP toimituspaikkojen synkronointi";
      case "SAP_ITEM_GROUP_SYNC":
        return "SAP marjalajien synkronointi";
      case "UPDATE_CURRENT_YEAR_APPROVED_CONTRACTS_TO_SAP":
        return "Tämänvuotisten hyväksyttyjen sopimusten vienti SAP:iin";
      default:
        return `Unknown type ${type}`;
    }
  }

}