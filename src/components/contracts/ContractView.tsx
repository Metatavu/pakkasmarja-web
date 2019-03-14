import * as React from "react";
import * as actions from "../../actions/";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import "../../styles/common.scss";
import { ContractTableData, StoreState, ContractData, ContractDataKey } from "src/types";
import { Contract, ItemGroup, Price, Contact, DeliveryPlace, AreaDetail } from "pakkasmarja-client";
import Api from "pakkasmarja-client";
import BasicLayout from "../generic/BasicLayout";
import { Dimmer, Loader, Container } from "semantic-ui-react";
import ContractHeader from "./ContractHeader";
import ContractParties from "./ContractParties";
import ContractPrices from "./ContractPrices";
import ContractAmount from "./ContractAmount";

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
    const contract = await this.loadContract(contractId);
    const itemGroup = await this.loadItemGroup(contract);
    const prices = await this.loadPrices(contract);
    const contact = await this.loadContact(contract);
    const deliveryPlaces = await this.loadDeliveryPlaces();

    this.setState({ 
      loading: false,
      contract: contract,
      itemGroup: itemGroup,
      prices: prices,
      contact: contact,
      deliveryPlaces: deliveryPlaces
    });
  }

  /**
   * Load contract
   */
  private loadContract = async (contractId: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !contractId) {
      return;
    }

    this.setState({ loadingText: "Loading contract" });
    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    return await contractsService.findContract(contractId, "application/json");
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
   * On user input change
   * 
   * @param key key
   * @param value value
   */
  private updateContractData = (key: ContractDataKey, value: boolean | string | AreaDetail[]) => {
    const contractData = this.state.contractData;
    contractData[key] = value;

    this.setState({ contractData: contractData });
    //this.checkIfCompanyApprovalNeeded();
  }

  /**
   * Render method
   */
  public render() {
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