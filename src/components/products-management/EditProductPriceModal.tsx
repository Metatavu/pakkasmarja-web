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
  productPriceId: string;
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
 * Class for edit product price modal component
 */
class EditProductPriceModal extends React.Component<Props, State> {

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
      unit: "",
      price: ""
    };
  }

  /**
   * Component did update life-cycle event
   * 
   * @param prevProps prevProps
   */
  public async componentDidUpdate(prevProps: Props) {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    if (this.props.modalOpen != prevProps.modalOpen && this.props.modalOpen) {
      const productPriceService = await Api.getProductPricesService(this.props.keycloak.token);
      const productPrice: ProductPrice = await productPriceService.findProductPrice(this.props.productId, this.props.productPriceId);
      this.setState({
        unit: productPrice.unit,
        price: productPrice.price
      });
    }
  }

  /**
   * Handle product price update
   */
  private handleUpdatePrice = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const productPrice: ProductPrice = {
      productId: this.props.productId,
      unit: this.state.unit,
      price: this.state.price
    }
    const productPriceService = await Api.getProductPricesService(this.props.keycloak.token);
    await productPriceService.updateProductPrice(productPrice, this.props.productId, this.props.productPriceId);
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
            Muokkaa tuote hintaa:
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
            <Button onClick={this.handleUpdatePrice} color="red">{"Muokkaa hintaa"}</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(EditProductPriceModal);
