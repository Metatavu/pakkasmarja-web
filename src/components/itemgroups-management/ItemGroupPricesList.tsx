import * as React from "react";
import * as actions from "../../actions";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import Api, { ItemGroupPrice } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, Dimmer, Loader, Button } from "semantic-ui-react";
import { Table } from 'semantic-ui-react';
import BasicLayout from "../generic/BasicLayout";
import { Link } from "react-router-dom";
import CreateAndUpdateItemGroupPriceModal from "./CreateAndEditItemGroupPriceModal";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  itemGroups: ItemGroup[];
  loading: boolean;
  itemGroupId: string;
  itemGroup: ItemGroup;
  itemGroupPrices: ItemGroupPrice[];
  createModal: boolean;
  edit: boolean;
  itemGroupPriceId?: string;
}

/**
 * Class for itemgroup prices list component
 */
class ItemGroupPricesList extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      itemGroups: [],
      loading: false,
      itemGroupId: "",
      itemGroup: {},
      itemGroupPrices: [],
      createModal: false,
      edit: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public componentDidMount() {
    this.loadData();
  }

  /**
   * Load data
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const itemGroupId: string = this.props.match.params.itemGroupId;
    this.setState({ itemGroupId, loading: true });
    await this.loadItemGroup();
    await this.loadItemGroupPrices();
    this.setState({ loading: false });
  }

  /**
   * Load item group
   */
  private loadItemGroup = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroup = await itemGroupsService.findItemGroup(this.state.itemGroupId);
    await this.setState({ itemGroup });
  }

  /**
   * Load item group prices
   */
  private loadItemGroupPrices = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroupPrices = await itemGroupsService.listItemGroupPrices(this.state.itemGroupId, undefined, undefined, undefined, 100);
    await this.setState({ itemGroupPrices });
  }

  /**
   * Handle item group price delete
   * 
   * @param itemGroupPriceId itemGroupPriceId
   */
  private handleDelete = async (itemGroupPriceId: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    await itemGroupsService.deleteItemGroupPrice(this.state.itemGroupId, itemGroupPriceId);
    this.loadData();
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
              Ladataan marjalajeja
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <BasicLayout>
        <Header floated='left' className="contracts-header">
          <p>{`${this.state.itemGroup.name} - hinnat`}</p>
        </Header>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={2}>
                Vuosi
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Ryhmä
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Hinta
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
                Yksikkö
              </Table.HeaderCell>
              <Table.HeaderCell width={3}>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.itemGroupPrices.map((itemGroupPrice: ItemGroupPrice) => {
                return (
                  <Table.Row key={itemGroupPrice.id}>
                    <Table.Cell>
                      {itemGroupPrice.year}
                    </Table.Cell>
                    <Table.Cell>
                      {itemGroupPrice.group}
                    </Table.Cell>
                    <Table.Cell>
                      {itemGroupPrice.price}
                    </Table.Cell>
                    <Table.Cell>
                      {itemGroupPrice.unit}
                    </Table.Cell>
                    <Table.Cell textAlign="center" >
                      <Button.Group className="contract-button-group" >
                        <Button onClick={() => this.setState({ edit: true, itemGroupPriceId: itemGroupPrice.id, createModal: true })} color="red">Muokkaa</Button>
                        <Button.Or text="" />
                        <Button onClick={() => this.handleDelete(itemGroupPrice.id || "")} color="black">Poista</Button>
                      </Button.Group>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            }
          </Table.Body>
        </Table>
        <Button.Group floated="right" className="contract-button-group" >
          <Button as={Link} to="/itemGroupsManagement" inverted color="red">Takaisin</Button>
          <Button.Or text="" />
          <Button onClick={() => this.setState({ edit: false, createModal: true })} color="red">Uusi hinta</Button>
        </Button.Group>
        <CreateAndUpdateItemGroupPriceModal
          modalOpen={this.state.createModal}
          closeModal={() => this.setState({ createModal: false })}
          itemGroupId={this.state.itemGroupId}
          loadData={this.loadData}
          edit={this.state.edit}
          itemGroupPriceId={this.state.itemGroupPriceId}
        />
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

export default connect(mapStateToProps, mapDispatchToProps)(ItemGroupPricesList);
