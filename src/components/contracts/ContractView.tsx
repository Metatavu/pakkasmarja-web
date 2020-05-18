import * as React from "react";
import * as actions from "../../actions/";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import "../../styles/common.css";
import { ContractTableData, StoreState, ContractData, ContractDataKey } from "src/types";
import { Contract, ItemGroup, Contact, ItemGroupPrice, DeliveryPlace, AreaDetail, SignAuthenticationService } from "pakkasmarja-client";
import Api from "pakkasmarja-client";
import BasicLayout from "../generic/BasicLayout";
import { Dimmer, Loader, Container } from "semantic-ui-react";
import ContractHeader from "./ContractHeader";
import ContractParties from "./ContractParties";
import ContractPrices from "./ContractPrices";
import ContractAmount from "./ContractAmount";
import ContractAreaDetails from "./ContractAreaDetails";
import ContractDeliveryPlace from "./ContractDeliveryPlace";
import ContractFooter from "./ContractFooter";
import ContractDocument from "./ContractDocument";
import ContractRejectModal from "./ContractRejectModal";
import { Redirect } from "react-router";
import { PDFService } from "src/api/pdf.service";
import * as moment from "moment";
import AppConfig, { AppConfigItemGroupOptions } from "../../utils/AppConfig";
import FileUtils from "src/utils/FileUtils";
import strings from "src/localization/strings";

/**
 * Interface for component State
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
  contractData: ContractTableData;
  match?: any;
}

/**
 * Interface for component State
 */
interface State {
  contractId?: string;
  contracts?: Contract[];
  contract?: Contract;
  itemGroup?: ItemGroup;
  prices?: ItemGroupPrice[];
  contact?: Contact;
  deliveryPlaces?: DeliveryPlace[];
  loading: boolean;
  loadingText: string;
  companyName: string;
  companyBusinessId: string;
  contractData: ContractData;
  companyApprovalRequired: boolean;
  rejectModalOpen: boolean;
  signAuthenticationServices: SignAuthenticationService[];
  redirect: boolean;
  navigateToTerms: boolean;
  pdfType: string;
  missingPrerequisiteContract: boolean;
  insufficientContractAmount: boolean;
  missingAreaDetails: boolean;
  allowDeliveryAll: boolean;
  requireAreaDetails: boolean;
  validationErrorText: string;
}

/**
 * Class for contract view component
 */
class ContractView extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      validationErrorText: "",
      allowDeliveryAll: false,
      requireAreaDetails: false,
      loading: false,
      loadingText: "",
      companyName: "Pakkasmarja Oy",
      companyBusinessId: "0434204-0",
      companyApprovalRequired: false,
      rejectModalOpen: false,
      signAuthenticationServices: [],
      redirect: false,
      navigateToTerms: false,
      pdfType: "2020",
      missingPrerequisiteContract: false,
      insufficientContractAmount: false,
      missingAreaDetails: false,
      contractData: {
        rejectComment: "",
        proposedQuantity: 0,
        deliverAllChecked: false,
        quantityComment: "",
        areaDetailValues: [],
        deliveryPlaceId: "",
        deliveryPlaceComment: ""
      }
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    this.setState({ loading: true });

    const contractId = this.props.match.params.contractId;
    const contracts = await this.loadContracts();
    const contract = await this.findContract(contractId);
    const itemGroup = await this.loadItemGroup(contract);
    const prices = await this.loadPrices(contract);
    const contact = await this.loadContact(contract);
    const deliveryPlaces = await this.loadDeliveryPlaces();

    if (contract) {
      this.updateContractData("quantityComment", contract.quantityComment || "");
      this.updateContractData("deliveryPlaceComment", contract.deliveryPlaceComment || "");
      this.updateContractData("deliveryPlaceId", contract.deliveryPlaceId || "");
      this.updateContractData("deliverAllChecked", contract.deliverAll);
      this.updateContractData("rejectComment", contract.rejectComment || "");
      this.updateContractData("proposedQuantity", contract.proposedQuantity || contract.contractQuantity || "");
      this.updateContractData("areaDetailValues", contract.areaDetails || []);
    }


    const prerequisiteContractItemGroupId = itemGroup ? itemGroup.prerequisiteContractItemGroupId : null;
    if (prerequisiteContractItemGroupId) {
      const hasContract = (await this.hasContractInItemGroup(prerequisiteContractItemGroupId, "APPROVED")) || (await this.hasContractInItemGroup(prerequisiteContractItemGroupId, "ON_HOLD"));
      this.setState({ missingPrerequisiteContract: !hasContract });
    }

    this.setState({
      loading: false,
      contracts: contracts,
      contract: contract,
      itemGroup: itemGroup,
      prices: prices,
      contact: contact,
      deliveryPlaces: deliveryPlaces
    });

    const appConfig = await AppConfig.getAppConfig();

    if (appConfig && itemGroup && itemGroup.id) {
      const configItemGroups = appConfig["item-groups"];
      const itemGroupId = itemGroup.id;
      const configItemGroup: AppConfigItemGroupOptions = configItemGroups[itemGroupId];
      const requireAreaDetails = configItemGroup && configItemGroup["require-area-details"] ? true : false;
      const allowDeliveryAll = configItemGroup && configItemGroup["allow-delivery-all"] ? true : false;
      const areaDetailValues = this.state.contractData.areaDetailValues;
      const totalAmount = this.calculateTotalAmount(areaDetailValues, itemGroup.minimumProfitEstimation);
      if (requireAreaDetails) {
        if (areaDetailValues.length < 1) {
          this.setState({
            missingAreaDetails: true,
            validationErrorText: strings.fillAreaDetails
          });
        } else if (!this.allFieldsFilled(areaDetailValues)) {
          this.setState({
            missingAreaDetails: true,
            validationErrorText: strings.fillAllAreaDetailFields
          });
        }
      } else if (!this.isValidContractMinimumAmount(totalAmount)) {
        this.setState({
          insufficientContractAmount: true,
          validationErrorText: strings.insufficientContractAmount
        });
      } else {
        this.setState({
          validationErrorText: "",
          missingAreaDetails: false,
          insufficientContractAmount: false
        });
      }

      this.setState({ requireAreaDetails, allowDeliveryAll });
    }
    this.checkIfCompanyApprovalNeeded();
  }

  /**
   * Load contracts
   */
  private loadContracts = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loadingText: "Loading contracts" });
    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    return await contractsService.listContracts("application/json", undefined, undefined, undefined, undefined, undefined, 0, 99);
  }

  /**
   * Find contract
   * 
   * @param id id
   * @return Found contract
   */
  private findContract = async (id: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loadingText: "Loading contracts" });
    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    return await contractsService.findContract(id, "application/json");
  }

  /**
   * Load item group
   * 
   * @param contract contract
   * @return Found itemgroup
   */
  private loadItemGroup = async (contract?: Contract) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !contract || !contract.itemGroupId) {
      return;
    }

    this.setState({ loadingText: "Loading itemgroup" });
    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    return await itemGroupsService.findItemGroup(contract.itemGroupId);
  }

  /**
   * Load prices
   * 
   * @param contract contract
   * @return Found prices
    */
  private loadPrices = async (contract?: Contract) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !contract || !contract.itemGroupId) {
      return;
    }

    this.setState({ loadingText: "Loading prices" });
    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    return await itemGroupsService.listItemGroupPrices(contract.itemGroupId,undefined,"ASC",0,100);
  }

  /**
   * Load contact
   * 
   * @param contract contract
   * @return Found contact
   */
  private loadContact = async (contract?: Contract) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !contract || !contract.contactId) {
      return;
    }

    this.setState({ loadingText: "Loading contact" });
    const contactsService = await Api.getContactsService(this.props.keycloak.token);
    return await contactsService.findContact(contract.contactId);
  }

  /**
   * Load delivery places
   */
  private loadDeliveryPlaces = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loadingText: "Loading delivery places" });
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    return await deliveryPlacesService.listDeliveryPlaces();
  }

  /**
   * Accept button clicked
   */
  private acceptContractClicked = async () => {
    if (!this.props.keycloak || !this.state.contract || !this.props.keycloak.token) {
      return;
    }
    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const contractData = this.state.contractData;
    const contract = this.state.contract;

    contract.proposedDeliverAll = contractData.deliverAllChecked;
    contract.proposedDeliveryPlaceId = contractData.deliveryPlaceId;
    contract.deliveryPlaceComment = contractData.deliveryPlaceComment;
    contract.proposedQuantity = contractData.proposedQuantity;
    contract.quantityComment = contractData.quantityComment;
    if (this.state.companyApprovalRequired) {
      contract.status = "ON_HOLD";
    }

    if (contractData.areaDetailValues && contractData.areaDetailValues.length > 0) {
      const areaDetails: AreaDetail[] = [];
      contractData.areaDetailValues.forEach((areaDetailObject: any) => {
        areaDetails.push({
          size: areaDetailObject.size,
          species: areaDetailObject.species,
          name: areaDetailObject.name,
          profitEstimation: areaDetailObject.profitEstimation
        });
      });

      contract.areaDetails = areaDetails;
    }

    const updatedContract = await contractsService.updateContract(contract, contract.id || "");

    if (updatedContract.status !== "DRAFT") {
      this.setState({ redirect: true });
    } else {
      const signAuthenticationServicesService = await Api.getSignAuthenticationServicesService(this.props.keycloak.token);
      const signAuthenticationServices = await signAuthenticationServicesService.listSignAuthenticationServices();
      this.setState({ signAuthenticationServices: signAuthenticationServices, navigateToTerms: true });
    }
  }

  /**
   * 
   * @returns returns whether logged user has given itemgroup and status
   */
  private hasContractInItemGroup = async (itemGroupId: string, status: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return false;
    }
    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const contracts = await contractsService.listContracts("application/json", undefined, undefined, itemGroupId, moment().year(), status);
    return contracts.length > 0;
  }
  /**
   * Decline button clicked
   */
  private declineContractClicked = () => {
    this.setState({ rejectModalOpen: true });
  }

  /**
   * On user input change
   * 
   * @param key key
   * @param value value
   */
  private updateContractData = (key: ContractDataKey, value: boolean | string | number | AreaDetail[]) => {
    const { contractData, itemGroup } = this.state;
    const minimumProfitEstimation = itemGroup ? itemGroup.minimumProfitEstimation : undefined;
    contractData[key] = value;
    this.setState({ contractData: contractData });
    this.checkIfCompanyApprovalNeeded();

    if (this.state.requireAreaDetails) {
      if (this.state.contractData.areaDetailValues.length < 1) {
        this.setState({
          validationErrorText: strings.fillAreaDetails,
          missingAreaDetails: true
        });
        return;
      } else if (!this.allFieldsFilled(contractData.areaDetailValues)) {
        this.setState({
          validationErrorText: strings.fillAllAreaDetailFields,
          missingAreaDetails: true
        });
        return;
      } else {
        this.setState({
          validationErrorText: "",
          missingAreaDetails: false
        })
      }
    }

    const totalAmount = this.calculateTotalAmount(contractData.areaDetailValues, minimumProfitEstimation);
    if (!this.isValidContractMinimumAmount(totalAmount)) {
      this.setState({
        insufficientContractAmount: true,
        validationErrorText: strings.insufficientContractAmount
      });
      return;
    } else {
      this.setState({
        insufficientContractAmount: false,
        validationErrorText: ""
      });
    }
  }

  /**
   * Check if company approval is needed
   */
  private checkIfCompanyApprovalNeeded = () => {
    if (!this.state.contract) {
      return;
    }

    const contractQuantity = this.state.contract.contractQuantity;
    const currentQuantity = this.state.contractData.proposedQuantity;
    const contractPlaceId = this.state.contract.deliveryPlaceId;
    const currentContractPlaceId = this.state.contractData.deliveryPlaceId;
    const deliverAll = this.state.contract.deliverAll;
    const proposedDeliverAll = this.state.contractData.deliverAllChecked;
    if (contractQuantity != currentQuantity || contractPlaceId != currentContractPlaceId || deliverAll != proposedDeliverAll) {
      this.setState({ companyApprovalRequired: true });
    } else {
      this.setState({ companyApprovalRequired: false });
    }
  }

  /**
   * Download contract as pdf
   */
  private downloadContractPdfClicked = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract || !this.state.contract.id) {
      return;
    }

    this.setState({ loading: true, loadingText: "Loading pdf..." });
    const pdfService = new PDFService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);
    const pdfData = await pdfService.getPdf(this.state.contract.id, this.state.pdfType);
    this.setState({ loading: false });
    this.downloadPdfBlob(pdfData);
  }

  /**
   * Download pdf to users computer
   * 
   * @param pdfData pdf data
   */
  private downloadPdfBlob = (pdfData: any) => {
    pdfData.blob().then((blob: any) => {
      FileUtils.downloadBlob(blob, "application/pdf", `${new Date().toLocaleDateString()}.pdf`);
    });
  }

  /**
   * Returns true if all fields of area detail values are filled
   * @param areaDetailValues area detail values
   * @returns true if all fields are filled, otherwise false
   */
  private allFieldsFilled = (areaDetailValues: AreaDetail[]): boolean => {
    for (const areaDetail of areaDetailValues) {
      const { name, size, species } = areaDetail;
      if (!name || !size || !species) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns if contract proposed quantity is at least the total amount calculated from area details
   * @param totalAmount total amount calculated from area details
   * @returns true is quantity is at least the total amount, otherwise false
   */
  private isValidContractMinimumAmount = (totalAmount: number): boolean => {
    const { proposedQuantity } = this.state.contractData;
    return proposedQuantity >= totalAmount;
  }

  /**
   * Returns total amount from area detail values
   * @param areaDetailValues area detail values
   * @param minimumProfit minimum profit, if predefined in contract
   * @returns total amount as number
   */
  private calculateTotalAmount = (areaDetailValues: AreaDetail[], minimumProfit?: number): number => {
    const hasItems = areaDetailValues.length > 0;
    return hasItems ? areaDetailValues.reduce((total, areaDetailValue) => {
      const estimation = minimumProfit || areaDetailValue.profitEstimation || 0;
      const hectares = areaDetailValue.size ? areaDetailValue.size : 0;
      return total += estimation * hectares;
    }, 0) : 0;
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to={`/contracts`} push={true} />;
    }

    if (this.state.navigateToTerms && this.state.contract) {
      return <Redirect to={`/contracts/${this.state.contract.id}/terms`} push={true} />;
    }

    if (this.state.loading || !this.state.contracts || !this.state.contract || !this.state.itemGroup || !this.state.deliveryPlaces) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              {this.state.loadingText}
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }
    return (
      <BasicLayout>
        <Container>
          <ContractHeader
            itemGroup={this.state.itemGroup}
          />
          <ContractParties
            companyName={this.state.companyName}
            companyBusinessId={this.state.companyBusinessId}
            contact={this.state.contact}
          />
          <ContractPrices
            itemGroup={this.state.itemGroup}
            prices={this.state.prices}
          />
          <ContractAmount
            itemGroup={this.state.itemGroup}
            contract={this.state.contract}
            contracts={this.state.contracts}
            onUserInputChange={this.updateContractData}
            contractAmount={this.state.contract ? this.state.contract.contractQuantity : 0}
            proposedAmount={this.state.contractData.proposedQuantity}
            quantityComment={this.state.contractData.quantityComment}
            deliverAllChecked={this.state.contractData.deliverAllChecked}
            allowDeliveryAll={this.state.allowDeliveryAll}
          />
          {
            this.state.requireAreaDetails &&
            <ContractAreaDetails
              itemGroup={this.state.itemGroup}
              areaDetailValues={this.state.contractData.areaDetailValues}
              totalAmount={ this.calculateTotalAmount(this.state.contractData.areaDetailValues, this.state.itemGroup.minimumProfitEstimation) }
              isReadOnly={this.state.contract.status !== "DRAFT"}
              onUserInputChange={this.updateContractData}
            />
          }
          <ContractDeliveryPlace
            contract={this.state.contract}
            onUserInputChange={this.updateContractData}
            deliveryPlaces={this.state.deliveryPlaces}
            selectedPlaceId={this.state.contractData.deliveryPlaceId}
            deliveryPlaceComment={this.state.contractData.deliveryPlaceComment}
            isReadOnly={this.state.contract.status !== "DRAFT"}
          />
          <ContractDocument
            contractId={this.state.contract && this.state.contract.id || ""}
          />
          <ContractFooter
            canAccept={!this.state.missingPrerequisiteContract && !this.state.missingAreaDetails && !this.state.insufficientContractAmount}
            errorText={this.state.missingPrerequisiteContract ? strings.missingPrerequisiteContract : undefined}
            isActiveContract={this.state.contract ? this.state.contract.status === "APPROVED" : false}
            downloadContractPdf={this.downloadContractPdfClicked}
            acceptContract={this.acceptContractClicked}
            declineContract={this.declineContractClicked}
            approveButtonText={this.state.companyApprovalRequired ? "Ehdota muutosta" : "Hyväksyn"}
            validationErrorText={this.state.validationErrorText}
          />
          <ContractRejectModal
            onUserInputChange={this.updateContractData}
            rejectComment={this.state.contractData.rejectComment}
            modalOpen={this.state.rejectModalOpen}
            closeModal={() => this.setState({ rejectModalOpen: false })}
            contract={this.state.contract}
            contractRejected={() => this.setState({ redirect: true })}
          />
        </Container>
      </BasicLayout>
    );
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ContractView);
