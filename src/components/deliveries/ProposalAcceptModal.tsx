import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState, DeliveryProduct, DeliveriesState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Divider } from "semantic-ui-react";
import Api, { Product, Delivery } from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean;
  closeModal: () => void;
  keycloak?: Keycloak.KeycloakInstance;
  deliveryId: string;
  loadData: () => void;
  deliveries?: DeliveriesState;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
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
   * Handle proposal accept
   */
  private handleProposalAccept = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.deliveryProduct || !this.state.deliveryProduct.product) {
      return;
    }

    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const delivery: Delivery = {
      id: this.state.deliveryProduct.delivery.id,
      productId: this.state.deliveryProduct.product.id || "",
      userId: this.props.keycloak.subject || "",
      time: this.state.deliveryProduct.delivery.time,
      status: "PLANNED",
      amount: this.state.deliveryProduct.delivery.amount,
      price: this.state.deliveryProduct.delivery.price,
      qualityId: this.state.deliveryProduct.delivery.qualityId,
      deliveryPlaceId: this.state.deliveryProduct.delivery.deliveryPlaceId
    }

    const updateDelivery = await deliveriesService.updateDelivery(delivery, this.state.deliveryProduct.delivery.id || "");
    const updatedDeliveryProduct: DeliveryProduct = { delivery: updateDelivery, product: this.state.deliveryProduct.product };
    const updatedDeliveries = this.getUpdatedDeliveryData(updatedDeliveryProduct);
    this.props.deliveriesLoaded && this.props.deliveriesLoaded(updatedDeliveries);
    this.props.loadData();
    this.closeModal();
  }

  /**
   * Get updated delivery data 
   * 
   * @param deliveryProduct deliveryProduct
   */
  private getUpdatedDeliveryData = (deliveryProduct: DeliveryProduct): DeliveriesState => {
    if (!this.props.deliveries) {
      return { frozenDeliveryData: [], freshDeliveryData: [] };
    }

    const deliveries = { ... this.props.deliveries };
    const freshDeliveries = deliveries.freshDeliveryData.map((deliveryData: DeliveryProduct) => {
      if (deliveryData.delivery.id === deliveryProduct.delivery.id) {
        return {
          delivery: deliveryProduct.delivery,
          product: deliveryProduct.product
        }
      }
      return deliveryData;
    });
    const frozenDeliveries = deliveries.frozenDeliveryData.map((deliveryData: DeliveryProduct) => {
      if (deliveryData.delivery.id === deliveryProduct.delivery.id) {
        return {
          delivery: deliveryProduct.delivery,
          product: deliveryProduct.product
        }
      }
      return deliveryData;
    });

    const deliveriesState: DeliveriesState = {
      freshDeliveryData: freshDeliveries || [],
      frozenDeliveryData: frozenDeliveries || []
    }
    return deliveriesState;
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
            {strings.acceptSuggestion}
          </Header>
          <Divider />
          <Header as="h3">{strings.productName} </Header><span>{this.state.deliveryProduct.product.name}</span>
          <Header as="h3">{strings.productUnitName} </Header><span>{this.state.deliveryProduct.product.unitName}</span>
          <Header as="h3">{strings.productUnitSize} </Header><span>{this.state.deliveryProduct.product.unitSize}</span>
          <Header as="h3">{strings.productUnits} </Header><span>{this.state.deliveryProduct.product.units}</span>
          <Header as="h3">{strings.amount} </Header><span>{this.state.deliveryProduct.delivery.amount}</span>
          <Divider style={{ paddingBottom: 0, marginBottom: 0 }} />
          <Button.Group floated="right" className="contract-button-group" >
            <Button onClick={this.closeModal} color="black">{strings.close}</Button>
            <Button.Or text="" />
            <Button onClick={this.handleProposalAccept} color="red">{strings.accept}</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(ProposalAcceptModal);
