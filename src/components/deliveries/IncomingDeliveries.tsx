import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Segment, Header, Divider, Item, Button } from "semantic-ui-react";
import { Link } from "react-router-dom";
import Moment from "react-moment";
import ViewModal from "./ViewModal";
import Api, { Delivery, ItemGroupCategory } from "pakkasmarja-client";


/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveries?: DeliveriesState;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  frozenDeliveries?: DeliveryProduct[];
  freshDeliveries?: DeliveryProduct[];
  viewModal: boolean;
  deliveryId?: string;
  redirect: boolean;
}

/**
 * Class for incoming deliveries component
 */
class IncomingDeliveries extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      viewModal: false,
      redirect: false
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
  private loadData = () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.deliveries) {
      return;
    }
    const filterCondition = ["PROPOSAL", "PLANNED", "DELIVERY"];
    const frozenDeliveryData: DeliveryProduct[] = this.props.deliveries.frozenDeliveryData;
    const frozenDeliveries: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => filterCondition.includes(deliveryData.delivery.status));
    const freshDeliveryData: DeliveryProduct[] = this.props.deliveries.freshDeliveryData;
    const freshDeliveries: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => filterCondition.includes(deliveryData.delivery.status));
    this.setState({ frozenDeliveries, freshDeliveries });
  }

  /**
   * Renders elements depending on delivery status
   * 
   * @param deliveryProduct deliveryProduct
   * @param category category
   */
  private renderStatus(deliveryProduct: DeliveryProduct, category: ItemGroupCategory) {
    const status: string = deliveryProduct.delivery.status;
    if (status === "PROPOSAL") {
      return (
        <Header style={{ margin: "auto", marginRight: 50 }} as="h3">Tarkistuksessa</Header>
      );
    } else if (status === "DELIVERY") {
      return (
        <Header style={{ margin: "auto", marginRight: 50 }} as="h3">Toimituksessa</Header>
      );
    } else if (status === "PLANNED") {
      return (
        <Button.Group floated="right" style={{ maxHeight: "37px" }}>
          <Button as={Link} to={`/editDelivery/${category}/${deliveryProduct.delivery.id}`} color="red">Editoi</Button>
          <Button.Or text="" />
          <Button onClick={() => this.handleBeginDelivery(deliveryProduct)} color="green">Aloita toimitus</Button>
        </Button.Group>
      );
    }

    return null;
  }

  /**
   * Handles begin delivery
   * 
   * @param deliveryProduct
   */
  private handleBeginDelivery = async (deliveryProduct: DeliveryProduct) => {
    const delivery = deliveryProduct.delivery;
    if (!this.props.keycloak || !this.props.keycloak.token || !delivery.id) {
      return;
    }
    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    const updatedDelivery: Delivery = {
      id: "",
      productId: delivery.productId,
      userId: this.props.keycloak.subject || "",
      time: delivery.time,
      status: "DELIVERY",
      amount: delivery.amount,
      price: "0",
      quality: "NORMAL",
      deliveryPlaceId: delivery.deliveryPlaceId
    }

    const updateDelivery = await deliveryService.updateDelivery(updatedDelivery, delivery.id);
    const updatedDeliveryProduct: DeliveryProduct = { delivery: updateDelivery, product: deliveryProduct.product };
    const updatedDeliveries = this.getUpdatedDeliveryData(updatedDeliveryProduct);
    this.props.deliveriesLoaded && this.props.deliveriesLoaded(updatedDeliveries);
    this.loadData();
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
    return (
      <React.Fragment>
        <Button style={{ marginTop: 20 }} color="red" attached="top" as={Link} to="createDelivery/FRESH">
          Uusi tuore toimitus
        </Button>
        <Segment attached>
          <Header as='h2'>Tuoretuotteet</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.freshDeliveries && this.state.freshDeliveries.map((deliveryProduct) => {
                if (!deliveryProduct.product) {
                  return;
                }
                return (
                  <Item key={deliveryProduct.delivery.id}>
                    <Item.Content onClick={() => { this.setState({ deliveryId: deliveryProduct.delivery.id, viewModal: true }) }}>
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                      <Item.Meta><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Meta>
                    </Item.Content>
                    {
                      this.renderStatus(deliveryProduct, "FRESH")
                    }
                  </Item>
                )
              })
            }
          </Item.Group>
        </Segment>
        <Button style={{ marginTop: 20 }} color="red" attached="top" as={Link} to="createDelivery/FROZEN">
          Uusi pakaste toimitus
        </Button>
        <Segment attached>
          <Header as='h2'>Pakastetuotteet</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.frozenDeliveries && this.state.frozenDeliveries.map((deliveryProduct) => {
                if (!deliveryProduct.product) {
                  return;
                }
                return (
                  <Item key={deliveryProduct.delivery.id}>
                    <Item.Content onClick={() => { this.setState({ deliveryId: deliveryProduct.delivery.id, viewModal: true }) }}>
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                      <Item.Meta><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Meta>
                    </Item.Content>
                    {
                      this.renderStatus(deliveryProduct, "FROZEN")
                    }
                  </Item>
                )
              })
            }
          </Item.Group>
        </Segment>
        <ViewModal
          modalOpen={this.state.viewModal}
          closeModal={() => this.setState({ viewModal: false })}
          deliveryId={this.state.deliveryId || ""}
        />
      </React.Fragment>
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

export default connect(mapStateToProps, mapDispatchToProps)(IncomingDeliveries);
