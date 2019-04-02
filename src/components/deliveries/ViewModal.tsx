import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState, DeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Divider } from "semantic-ui-react";
import Api, { Product } from "pakkasmarja-client";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean,
  closeModal: () => void,
  keycloak?: Keycloak.KeycloakInstance;
  deliveryId: string
};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean;
  deliveryProduct?: DeliveryProduct;
  redirect: boolean;
};

/**
 * View delivery modal component class
 */
class ViewModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      modalOpen: false,
      redirect: false
    };
  }

  /**
   * Component will receive props life-cycle event
   */
  public async componentWillReceiveProps() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const products: Product[] = await productsService.listProducts(undefined, undefined, undefined, undefined, 100);

    const deliveryId: string = await this.props.deliveryId;
    deliveriesService.findDelivery(deliveryId).then((delivery) => {
      const deliveryProduct: DeliveryProduct = {
        delivery: delivery,
        product: products.find(product => product.id === delivery.productId)
      }
      this.setState({ deliveryProduct });
    });
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
    if (!this.state.deliveryProduct || !this.state.deliveryProduct.product) {
      return <React.Fragment></React.Fragment>;
    }
    return (
      <Modal size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            Toimitus
          </Header>
          <Divider />
          <Header as="h3">Tuotteen nimi </Header><span>{this.state.deliveryProduct.product.name}</span>
          <Header as="h3">Tuotteen unitname </Header><span>{this.state.deliveryProduct.product.unitName}</span>
          <Header as="h3">Tuotteen unitSize </Header><span>{this.state.deliveryProduct.product.unitSize}</span>
          <Header as="h3">Tuotteen units </Header><span>{this.state.deliveryProduct.product.units}</span>
          <Header as="h3">Toimitus määrä </Header><span>{this.state.deliveryProduct.delivery.amount}</span>
          <Divider style={{ paddingBottom: 0, marginBottom: 0 }} />
          <Button floated="right" onClick={this.closeModal} style={{ marginBottom: 20, marginTop: 20 }} color="black">Sulje</Button>
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
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ViewModal);
