import * as React from "react";
import * as actions from "../../actions/";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import "../../styles/common.scss";
import { ContractTableData, StoreState, ContractData, ContractDataKey } from "src/types";
import { Contract, ItemGroup, Price, Contact, DeliveryPlace, AreaDetail, SignAuthenticationService } from "pakkasmarja-client";
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
import { Redirect } from "react-router";


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
  prices?: Price[];
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
}

/**
 * Class for contract item component
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
    const contract = contracts && contracts.find(contract => contract.id === contractId);
    const itemGroup = await this.loadItemGroup(contract);
    const prices = await this.loadPrices(contract);
    const contact = await this.loadContact(contract);
    const deliveryPlaces = await this.loadDeliveryPlaces();

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
    return await contractsService.listContracts("application/json", false);
  }

  /**
   * Load item group
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
    contract.deliveryPlaceId = contractData.deliveryPlaceId;
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
  private updateContractData = (key: ContractDataKey, value: boolean | string | AreaDetail[]) => {
    const contractData = this.state.contractData;
    contractData[key] = value;
    console.log(key);
    console.log(value);
    this.setState({ contractData: contractData });
    //this.checkIfCompanyApprovalNeeded();
  }

  /**
   * Download contract as pdf
   */
  private downloadContractPdfClicked = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract|| !this.state.contract.id) {
      return;
    }

    const pdfService = Api.getContractsService(this.props.keycloak.token);
    const pdfData = await pdfService.getContractDocument(this.state.contract.id, "2019", "PDF");
    console.log(pdfData);
    const file = new Blob([pdfData], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, "_blank");


    /*const pdfService = api.getPdfService(this.props.accessToken.access_token);
    const pdfPath = await pdfService.findPdf(this.state.contract.id, new Date().getFullYear().toString(), `${new Date().toLocaleDateString()}.pdf`);

    Alert.alert(
      'Lataus onnistui!',
      `PDF tiedosto on tallennettu polkuun ${pdfPath}. Palaa sopimuksiin painamalla OK.`,
      [
        {text: 'OK', onPress: () => this.props.navigation.navigate('Contracts', {})},
      ]
    );*/
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.navigateToTerms && this.state.contact) {
      return <Redirect to={`/contracts/${this.state.contact.id}/terms`} push={true} />;
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
            approveButtonText={this.state.companyApprovalRequired ? "EHDOTA MUUTOSTA" : "HYVÄKSYN"}
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