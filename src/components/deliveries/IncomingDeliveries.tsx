import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, SortedDeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Header, Item, Button, Grid, Image } from "semantic-ui-react";
import { Link, Redirect } from "react-router-dom";
import "../../styles/common.css";
import ViewModal from "./ViewModal";
import Api, { Delivery } from "pakkasmarja-client";
import strings from "src/localization/strings";
import BasicLayout from "../generic/BasicLayout";
import InDeliveryIcon from "../../gfx/indelivery_logo.png";
import PakkasmarjaRedLogo from "../../gfx/red_logo.png";
import * as _ from "lodash";
import * as moment from "moment";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveries?: DeliveriesState;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
  location?: any;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  sortedDeliveriesByTime?: ArrayLike<SortedDeliveryProduct>;
  viewModal: boolean;
  deliveryId?: string;
  redirect: boolean;
  pageTitle?: string;
  category?: string;
  redirectTo?: string;
  deliveryProduct?: DeliveryProduct;
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
    const category = this.props.location.state ? this.props.location.state.category : "";
    const filterCondition = ["PROPOSAL", "PLANNED", "DELIVERY"];
    if (category === "FRESH") {
      const freshDeliveryData: DeliveryProduct[] = this.props.deliveries.freshDeliveryData;
      const freshDeliveries: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => filterCondition.includes(deliveryData.delivery.status));
      const sortedDeliveriesByTime = this.sortDeliveryProducts(freshDeliveries);
      this.setState({ sortedDeliveriesByTime, category, pageTitle: strings.freshDeliveries });
    }
    if (category === "FROZEN") {
      const frozenDeliveryData: DeliveryProduct[] = this.props.deliveries.frozenDeliveryData;
      const frozenDeliveries: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => filterCondition.includes(deliveryData.delivery.status));
      const sortedDeliveriesByTime = this.sortDeliveryProducts(frozenDeliveries);
      this.setState({ sortedDeliveriesByTime, category, pageTitle: strings.frozenDeliveries });
    }
  }

  /**
   * Sort delivery products
   * 
   * @param deliveryProductArray deliveryProductArray
   * @returns sorted array
   */
  private sortDeliveryProducts = (deliveryProductArray: DeliveryProduct[]) => {
    const sortedDeliveryProductByDate = _.sortBy(deliveryProductArray, (deliveryProduct) => deliveryProduct.delivery.time).reverse();
    const sorted: ArrayLike<SortedDeliveryProduct> = _.chain(sortedDeliveryProductByDate)
      .groupBy(deliveryProduct => moment(deliveryProduct.delivery.time).format("DD.MM.YYYY"))
      .map((v, i) => {
        return {
          time: i,
          deliveryProducts: v
        }
      }).value();
    return sorted;
  }

  /**
   * Renders elements depending on delivery status
   * 
   * @param deliveryProduct deliveryProduct
   */
  private renderStatus(deliveryProduct: DeliveryProduct) {
    const status: string = deliveryProduct.delivery.status;
    const category: string = this.state.category || "";
    if (status === "PROPOSAL") {
      return (
        <React.Fragment>
          <Image src={PakkasmarjaRedLogo} style={{ float: "left", margin: "auto", maxHeight: "28px", maxWidth: "28px", marginRight: "17px" }} />
          <Header style={{ margin: "auto", marginRight: 35 }} color="red" as="h4">Ehdotuksissa</Header>
        </React.Fragment>
      );
    } else if (status === "DELIVERY") {
      return (
        <React.Fragment>
          <Image src={InDeliveryIcon} style={{ float: "left", margin: "auto", maxHeight: "21px", maxWidth: "35px", marginRight: "10px" }} />
          <Header style={{ margin: "auto", marginRight: 30 }} color="green" as="h4">Toimituksessa</Header>
        </React.Fragment>
      );
    } else if (status === "PLANNED") {
      return (
        <Button.Group floated="right" style={{ maxHeight: "37px" }}>
          <Button as={Link} to={`/editDelivery/${category}/${deliveryProduct.delivery.id}`} color="red">Muokkaa</Button>
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
   * redirects to another page
   */
  private redirectTo = () => {
    this.state.category === "FRESH"
      ? this.setState({ redirectTo: "/createDelivery/FRESH" })
      : this.setState({ redirectTo: "/createDelivery/FROZEN" })
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirectTo) {
      return (
        <Redirect to={this.state.redirectTo} />
      );
    }
    const { sortedDeliveriesByTime } = this.state;
    return (
      <BasicLayout
        pageTitle={this.state.pageTitle}
        topBarButtonText={this.state.category === "FRESH" ? strings.createNewFreshDelivery : strings.createNewFrozenDelivery}
        onTopBarButtonClick={this.redirectTo}>
        <Grid>
          <Grid.Row>
            <Grid.Column width={3}>
            </Grid.Column>
            <Grid.Column width={10}>
              {
                sortedDeliveriesByTime && Array.from(sortedDeliveriesByTime).map((obj) => {
                  return (
                    <React.Fragment key={obj.deliveryProducts[0].delivery.id}>
                      <div className="delivery-sort-time-container"><h3>Päivämäärä {obj.time}</h3></div>
                      <Item.Group divided >
                        {
                          obj.deliveryProducts.map((deliveryProduct) => {
                            if (!deliveryProduct.product) {
                              return;
                            }
                            return (
                              <Item key={deliveryProduct.delivery.id}>
                                <Item.Content className="open-modal-element" onClick={() => { this.setState({ deliveryProduct, deliveryId: deliveryProduct.delivery.id, viewModal: true }) }}>
                                  <Item.Header style={{ fontWeight: 500 }}>{`${deliveryProduct.product.name} ${deliveryProduct.delivery.amount} x ${deliveryProduct.product.units} ${deliveryProduct.product.unitName} `}</Item.Header>
                                  <Item.Description>{`${Number(moment(deliveryProduct.delivery.time).utc().format("HH")) > 12 ? "Jälkeen kello 12" : "Ennen kello 12"}`}</Item.Description>
                                </Item.Content>
                                {
                                  this.renderStatus(deliveryProduct)
                                }
                              </Item>
                            )
                          })
                        }
                      </Item.Group>
                    </React.Fragment>
                  )
                })
              }
            </Grid.Column>
            <Grid.Column width={3}>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <ViewModal
          modalOpen={this.state.viewModal}
          closeModal={() => this.setState({ viewModal: false })}
          deliveryId={this.state.deliveryId || ""}
          deliveryProduct={this.state.deliveryProduct}
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
function mapStateToProps(state: StoreState) {
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
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(IncomingDeliveries);
