import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions";
import { StoreState, DeliveriesState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Table, Input } from "semantic-ui-react";
import Api, { ProductPrice, Product } from "pakkasmarja-client";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean;
  closeModal: () => void;
  loadData: () => void;
  keycloak?: Keycloak.KeycloakInstance;
  product: Product;
};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean;
  redirect: boolean;
  unitName: string;
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
      unitName: "",
      price: ""
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public componentDidMount() {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return;
    }
    this.setState({unitName: this.props.product.unitName});
  }


  /**
   * Handle product price create
   */
  private handleCreatePrice = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.product.id) {
      return;
    }

    const productPrice: ProductPrice = {
      productId: this.props.product.id,
      unit: this.state.unitName,
      price: this.state.price
    }
    const productPriceService = await Api.getProductPricesService(this.props.keycloak.token);
    await productPriceService.createProductPrice(productPrice, this.props.product.id);
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
                    type="number"
                    step={0.01}
                    min={0}
                    onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                      this.handleInputChange("price", event.currentTarget.value)
                    }}
                    fluid />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    value={this.state.unitName}
                    disabled={true}
                    onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                      this.handleInputChange("unitName", event.currentTarget.value)
                    }}
                    fluid />
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
          <Button.Group floated="right" className="modal-button-group" >
            <Button onClick={this.closeModal} color="black">Sulje</Button>
            <Button.Or text="" />
            <AsyncButton onClick={ this.handleCreatePrice } color="red">{ "Lisää uusi hinta" }</AsyncButton>
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
