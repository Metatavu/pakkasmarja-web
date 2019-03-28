import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState, DeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button } from "semantic-ui-react";
import Api, { Product, Delivery } from "pakkasmarja-client";

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
 * Proposal accept modal component class
 */
class ProposalAcceptModal extends React.Component<Props, State> {

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
   * Component did mount life-sycle event
   */
  async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const products: Product[] = await productsService.listProducts();

    const deliveryId: string = this.props.deliveryId;
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
   * Handle proposal accept
   */
  private handleProposalAccept = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.deliveryProduct || !this.state.deliveryProduct.product) {
      return;
    }

    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    // miksi pitää laittaa || "" ?!?!?
    const delivery: Delivery = {
      id: this.state.deliveryProduct.delivery.id,
      productId: this.state.deliveryProduct.product.id || "",
      userId: this.props.keycloak.subject || "",
      time: this.state.deliveryProduct.delivery.time,
      status: "PLANNED",
      amount: this.state.deliveryProduct.delivery.amount,
      price: this.state.deliveryProduct.delivery.price,
      quality: this.state.deliveryProduct.delivery.quality,
      deliveryPlaceId: this.state.deliveryProduct.delivery.deliveryPlaceId
    }
    await deliveriesService.updateDelivery(delivery, this.state.deliveryProduct.delivery.id || "");
    this.setState({ redirect: true });
  }

  /**
   * Render method
   */
  public render() {
    return (
      <Modal size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            Hyväksytkö?
          </Header>
          <Button.Group floated="right" className="contract-button-group" >
            <Button onClick={this.closeModal} color="black">Sulje</Button>
            <Button.Or text="" />
            <Button onClick={this.handleProposalAccept} color="red">Hyväksy</Button>
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
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ProposalAcceptModal);