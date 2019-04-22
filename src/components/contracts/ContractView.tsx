import * as React from "react";
import * as actions from "../../actions/";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import "../../styles/common.scss";
import { ContractTableData, StoreState, ContractData, ContractDataKey } from "src/types";
import { Contract, ItemGroup, Contact,ItemGroupPrice, DeliveryPlace, AreaDetail, SignAuthenticationService } from "pakkasmarja-client";
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
import ContractRejectModal from "./ContractRejectModal";
import { Redirect } from "react-router";
import { PDFService } from "src/api/pdf.service";

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
      loading: false,
      loadingText: "",
      companyName: "Pakkasmarja Oy",
      companyBusinessId: "0434204-0",
      companyApprovalRequired: false,
      rejectModalOpen: false,
      signAuthenticationServices: [],
      redirect: false,
      navigateToTerms: false,
      pdfType: "2019",
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

    this.setState({
      loading: false,
      contracts: contracts,
      contract: contract,
      itemGroup: itemGroup,
      prices: prices,
      contact: contact,
      deliveryPlaces: deliveryPlaces
    });
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
    return await contractsService.listContracts("application/json");
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
    return await itemGroupsService.listItemGroupPrices(contract.itemGroupId);
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

    const contractData = this.state.contractData;
    const contract = this.state.contract;

    contract.deliverAll = contractData.deliverAllChecked;
    contract.proposedDeliveryPlaceId = contractData.deliveryPlaceId;
    contract.deliveryPlaceComment = contractData.deliveryPlaceComment;
    contract.proposedQuantity = contractData.proposedQuantity;
    contract.quantityComment = contractData.quantityComment;
    
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

    const contractsService = await Api.getContractsService(this.props.keycloak.token);

    if (this.state.companyApprovalRequired) {
      contract.status = "ON_HOLD";
      await contractsService.updateContract(contract, contract.id || "");
      this.setState({ redirect: true });
    } else {
      await contractsService.updateContract(contract, contract.id || "");
      const signAuthenticationServicesService = await Api.getSignAuthenticationServicesService(this.props.keycloak.token);
      const signAuthenticationServices = await signAuthenticationServicesService.listSignAuthenticationServices();
      this.setState({ signAuthenticationServices: signAuthenticationServices, navigateToTerms: true });
    }
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
    const contractData = this.state.contractData;
    contractData[key] = value;
    this.setState({ contractData: contractData });
    this.checkIfCompanyApprovalNeeded();
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

    if (contractQuantity != currentQuantity || contractPlaceId != currentContractPlaceId) {
      this.setState({ companyApprovalRequired: true });
    } else {
      this.setState({ companyApprovalRequired: false });
    }
  }

  /**
   * Download contract as pdf
   */
  private downloadContractPdfClicked = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract|| !this.state.contract.id) {
      return;
    }
    
    this.setState({loading: true, loadingText: "Loading pdf..."});
    const pdfService = new PDFService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);
    const pdfData = await pdfService.getPdf(this.state.contract.id, this.state.pdfType);
    this.setState({loading: false});
    this.downloadPdfBlob(pdfData);
  }

  /**
   * Download pdf to users computer
   * 
   * @param pdfData pdf data
   */
  private downloadPdfBlob = (pdfData: any) => {
    pdfData.blob().then((blob: any) => {
      const pdfBlob = new Blob([blob], {type: "application/pdf"});
      const data = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = data;
        link.download = `${new Date().toLocaleDateString()}.pdf`;
        link.click();
        setTimeout(function() {
          window.URL.revokeObjectURL(data);
        }, 100);
    });
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

    if (this.state.loading) {
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
        <Container text>
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
            onUserInputChange={this.updateContractData}
            contractAmount={this.state.contract ? this.state.contract.contractQuantity : 0}
            proposedAmount={this.state.contractData.proposedQuantity}
            quantityComment={this.state.contractData.quantityComment}
            deliverAllChecked={this.state.contractData.deliverAllChecked}
          />
          <ContractAreaDetails
            itemGroup={this.state.itemGroup}
            areaDetails={this.state.contract ? this.state.contract.areaDetails : undefined}
            areaDetailValues={this.state.contractData.areaDetailValues}
            isActiveContract={this.state.contract ? this.state.contract.status === "APPROVED" : false}
            onUserInputChange={this.updateContractData}
          />
          <ContractDeliveryPlace
            contract={this.state.contract}
            onUserInputChange={this.updateContractData}
            deliveryPlaces={this.state.deliveryPlaces}
            selectedPlaceId={this.state.contractData.deliveryPlaceId}
            deliveryPlaceComment={this.state.contractData.deliveryPlaceComment}
            isActiveContract={this.state.contract ? this.state.contract.status === "APPROVED" : false}
          />
          <ContractFooter
            isActiveContract={this.state.contract ? this.state.contract.status === "APPROVED" : false}
            downloadContractPdf={this.downloadContractPdfClicked}
            acceptContract={this.acceptContractClicked}
            declineContract={this.declineContractClicked}
            approveButtonText={this.state.companyApprovalRequired ? "Ehdota muutosta" : "Hyväksyn"}
          />
          <ContractRejectModal 
            onUserInputChange={this.updateContractData}
            rejectComment={this.state.contractData.rejectComment}
            modalOpen={this.state.rejectModalOpen}
            closeModal={() => this.setState({ rejectModalOpen: false })}
            contract={this.state.contract}
            contractRejected={() => this.setState({redirect:true})}
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