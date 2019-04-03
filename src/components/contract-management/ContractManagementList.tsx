import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, ContractManagementTableData, HttpErrorResponse } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import Api, { Contract, Contact, DeliveryPlace } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, Button } from "semantic-ui-react";
import ErrorMessage from "../generic/ErrorMessage";
import { Table } from 'semantic-ui-react';
import Moment from 'react-moment';
import { Link } from "react-router-dom";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  contractData: ContractManagementTableData[];
  itemGroups: ItemGroup[];
  contacts: Contact[];
  deliveryPlaces: DeliveryPlace[];
  contractsLoading: boolean;
  proposeContractModalOpen: boolean;
  selectedBerry: string;
  proposedContractQuantity: string;
  proposedContractQuantityComment: string;
  proposeContractModalType: string;
  errorMessage?: string;
}

/**
 * Class for contract list component
 */
class ContractManagementList extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      contractData: [],
      itemGroups: [],
      contacts: [],
      deliveryPlaces: [],
      contractsLoading: false,
      proposeContractModalOpen: false,
      selectedBerry: "",
      proposedContractQuantity: "",
      proposedContractQuantityComment: "",
      proposeContractModalType: ""
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    this.setState({ contractsLoading: true, errorMessage: undefined });

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const contracts: Contract[] | HttpErrorResponse = await contractsService.listContracts("application/json", true);
    console.log(contracts);
    if (this.isHttpErrorResponse(contracts)) {
      this.renderErrorMessage(contracts);
      return;
    }

    await this.loadItemGroups();
    await this.loadContacts();
    await this.loadDeliveryPlaces();

    contracts.forEach((contract) => {
      const contractsState: ContractManagementTableData[] = this.state.contractData;
      const itemGroup = this.state.itemGroups.find(itemGroup => itemGroup.id === contract.itemGroupId);
      const contact = this.state.contacts.find(contact => contact.id === contract.contactId);
      const deliveryPlace = this.state.deliveryPlaces.find(deliveryPlace => deliveryPlace.id === contract.deliveryPlaceId);

      contractsState.push({
        contract: contract,
        itemGroup: itemGroup,
        contact: contact,
        deliveryPlace: deliveryPlace
      });

      console.log(contractsState);
      this.setState({ contractData: contractsState });
    });

    this.setState({ contractsLoading: false });
  }

  /**
   * check if object is http error response
   */
  private isHttpErrorResponse(object: Contract[] | HttpErrorResponse): object is HttpErrorResponse {
    return 'code' in object;
  }

  /**
   * Render error message
   * 
   * @param response http response
   */
  private renderErrorMessage = (response: HttpErrorResponse) => {
    switch (response.code) {
      case 403:
        this.setState({ 
          errorMessage: "Sinulla ei ole oikeuksia hallita sopimukisa. Jos näin ei pitäisi olla, ole yhteydessä Pakkasmarjaan." 
        });
        break;
      default:
        this.setState({ 
          errorMessage: "Jokin meni pieleen sopimuksia ladattaessa. Yritä hetken kuluttua uudelleen." 
        });
        break;
    }
  }

  /**
   * Load item groups
   */
  private loadItemGroups = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroups = await itemGroupsService.listItemGroups();
    this.setState({ itemGroups: itemGroups });
  }

  /**
   * Load contacts
   */
  private loadContacts = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contactsService = await Api.getContactsService(this.props.keycloak.token);
    const contacts = await contactsService.listContacts();
    this.setState({ contacts: contacts });
  }

  /**
   * Load delivery places
   */
  private loadDeliveryPlaces = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    this.setState({ deliveryPlaces: deliveryPlaces });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.errorMessage) {
      return (
        <BasicLayout>
          <ErrorMessage 
            errorMessage={this.state.errorMessage}
          />
        </BasicLayout>
      );
    }
    return (
      <BasicLayout>
          <Header floated='left' className="contracts-header">
            <p>Sopimukset</p>
          </Header>
          <Header floated='left' className="contracts-header">
            <Button as={Link} to="createContract" color="red">Uusi sopimus</Button>
          </Header>
          <Table celled unstackable>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>
                  Toimittajan nimi
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Tila
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Marjalaji
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Sopimusmäärä
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Toimitettu määrä
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Toimituspaikka
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Huomautuskenttä
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Viljelijän allekirjoituspäivä
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Alkupäivä
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Loppupäivä
                </Table.HeaderCell>
                <Table.HeaderCell>
                  Pakkasmarjan hyväksyntäpäivä
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {
                this.state.contractData && this.state.contractData.map((contractData) => {
                  return (
                    <Table.Row>
                      <Table.Cell>
                        { contractData.contact ? contractData.contact.companyName : "-" }
                      </Table.Cell>
                      <Table.Cell>
                        { contractData.contract.status }
                      </Table.Cell>
                      <Table.Cell>
                        { contractData.itemGroup ? contractData.itemGroup.displayName : "" }
                      </Table.Cell>
                      <Table.Cell>
                        { contractData.contract.contractQuantity }
                      </Table.Cell>
                      <Table.Cell>
                        { contractData.contract.deliveredQuantity }
                      </Table.Cell>
                      <Table.Cell>
                        { contractData.deliveryPlace ? contractData.deliveryPlace.name : "" }
                      </Table.Cell>
                      <Table.Cell>
                        { contractData.contract.remarks }
                      </Table.Cell>
                      <Table.Cell>
                        <Moment format="DD.MM.YYYY">
                          { contractData.contract.signDate }
                        </Moment>
                      </Table.Cell>
                      <Table.Cell>
                        <Moment format="DD.MM.YYYY">
                          { contractData.contract.startDate }
                        </Moment>
                      </Table.Cell>
                      <Table.Cell>
                        <Moment format="DD.MM.YYYY">
                          { contractData.contract.endDate }
                        </Moment>
                      </Table.Cell>
                      <Table.Cell>
                        <Moment format="DD.MM.YYYY">
                          { contractData.contract.termDate }
                        </Moment>
                      </Table.Cell>
                    </Table.Row>
                  );
                })
              }
            </Table.Body>
          </Table>
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

export default connect(mapStateToProps, mapDispatchToProps)(ContractManagementList);