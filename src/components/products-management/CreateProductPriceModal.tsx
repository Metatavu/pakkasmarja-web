import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions";
import { StoreState, DeliveriesState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Table, Input } from "semantic-ui-react";
import Api, { ProductPrice } from "pakkasmarja-client";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean;
  closeModal: () => void;
  loadData: () => void;
  keycloak?: Keycloak.KeycloakInstance;
  productId: string;
};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean;
  redirect: boolean;
  unit: string;
  price: string;

};

/**
 * Class for create product price modal component
 */
class CreateProductPriceModal extends React.Component<Props, State> {

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
      unit: "€ / kg ALV 0%",
      price: ""
    };
  }


  /**
   * Handle product price create
   */
  private handleCreatePrice = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const productPrice: ProductPrice = {
      productId: this.props.productId,
      unit: this.state.unit,
      price: this.state.price
    }
    const productPriceService = await Api.getProductPricesService(this.props.keycloak.token);
    await productPriceService.createProductPrice(productPrice, this.props.productId);
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
            Lisää uusi tuote hinta:
          </Header>
          <Table celled unstackable>
            <Table.Header>
              <Table.Row>
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
            <Button onClick={this.handleCreatePrice} color="red">{"Lisää uusi hinta"}</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateProductPriceModal);
