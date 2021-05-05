import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions";
import { StoreState, DeliveriesState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Table, Input } from "semantic-ui-react";
import Api, { ItemGroupPrice } from "pakkasmarja-client";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean;
  closeModal: () => void;
  keycloak?: Keycloak.KeycloakInstance;
  itemGroupId: string;
  itemGroupPriceId?: string;
  loadData: () => void;
  edit?: boolean;
};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean;
  redirect: boolean;
  itemGroupPriceId?: string;
  id: string;
  group: string;
  year: number;
  unit: string;
  price: string;
  edit?: boolean;
};

/**
 * Class for create and update item group price modal component
 */
class CreateAndUpdateItemGroupPriceModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      modalOpen: false,
      redirect: false,
      id: "",
      group: "",
      year: 0,
      unit: "€ / kg ALV 0%",
      price: "",
      edit: false
    };
  }

  /**
   * Component did update life-cycle event
   * 
   * @param prevProps prevProps
   */
  public async componentDidUpdate(prevProps: Props) {
    if (this.props.edit != prevProps.edit || this.props.itemGroupPriceId != prevProps.itemGroupPriceId) {
      this.loadItemGroupPrice();
      this.setState({ edit: this.props.edit });
    }
  }

  /**
   * Load item group price
   */
  private loadItemGroupPrice = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.itemGroupPriceId) {
      return;
    }

    if (this.props.edit) {
      const itemGroupService = await Api.getItemGroupsService(this.props.keycloak.token);
      const itemGroupPrice: ItemGroupPrice = await itemGroupService.findItemGroupPrice(this.props.itemGroupId, this.props.itemGroupPriceId);
      this.setState({
        itemGroupPriceId: itemGroupPrice.id,
        group: itemGroupPrice.group,
        year: itemGroupPrice.year,
        unit: itemGroupPrice.unit,
        price: itemGroupPrice.price
      });
    } else {
      this.setState({
        group: "",
        year: 0,
        unit: "€ / kg ALV 0%",
        price: "",
      });
    }
  }

  /**
   * Handle item group price create
   */
  private handleCreatePrice = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupPrice: ItemGroupPrice = {
      id: '',
      group: this.state.group,
      year: this.state.year,
      unit: this.state.unit,
      price: this.state.price
    }
    const itemGroupService = await Api.getItemGroupsService(this.props.keycloak.token);
    itemGroupService.createItemGroupPrice(itemGroupPrice, this.props.itemGroupId);
    this.props.loadData();
    this.closeModal();
  }

  /**
   * Handle item group price update
   */
  private handleUpdatePrice = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupPrice: ItemGroupPrice = {
      id: this.state.itemGroupPriceId && this.state.itemGroupPriceId,
      group: this.state.group,
      year: this.state.year,
      unit: this.state.unit,
      price: this.state.price
    }

    const itemGroupService = await Api.getItemGroupsService(this.props.keycloak.token);
    itemGroupService.updateItemGroupPrice(itemGroupPrice, this.props.itemGroupId, itemGroupPrice.id || "");
    this.props.loadData();
    this.closeModal();
  }

  /**
   * Handle input change
   * 
   * @param key key
   * @param value value
   */
  private handleInputChange = (key: string, value: string | number) => {
    const state: State = this.state;
    state[key] = value;
    this.setState(state);
  }

  /**
   * Close modal
   */
  private closeModal = () => {
    this.props.closeModal();
  }

  /**
   * Render method
   */
  public render() {
    return (
      <Modal size="large" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            {this.state.edit ? "Muokkaa hintaa: " : "Lisää uusi hinta: "}
          </Header>
          <Table celled unstackable>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>
                  Vuosi
              </Table.HeaderCell>
                <Table.HeaderCell>
                  Ryhmä
              </Table.HeaderCell>
                <Table.HeaderCell>
                  Hinta
              </Table.HeaderCell>
                <Table.HeaderCell>
                  Yksikkö
              </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row >
                <Table.Cell>
                  <Input
                    value={this.state.year}
                    onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                      this.handleInputChange("year", event.currentTarget.value)
                    }}
                    fluid />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    value={this.state.group}
                    onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                      this.handleInputChange("group", event.currentTarget.value)
                    }}
                    fluid />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    value={this.state.price}
                    onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                      this.handleInputChange("price", event.currentTarget.value)
                    }}
                    fluid />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    value={this.state.unit}
                    onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                      this.handleInputChange("unit", event.currentTarget.value)
                    }}
                    fluid />
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
          <Button.Group floated="right" className="modal-button-group" >
            <Button onClick={this.closeModal} color="black">Sulje</Button>
            <Button.Or text="" />
            <AsyncButton
              onClick={ this.state.edit ? this.handleUpdatePrice : this.handleCreatePrice }
              color="red"
            >
              { this.state.edit ? "Tallenna muutokset" : "Lisää uusi hinta" }
            </AsyncButton>
          </Button.Group>
        </Modal.Content>
      </Modal>
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
    keycloak: state.keycloak,
    deliveries: state.deliveries
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateAndUpdateItemGroupPriceModal);
