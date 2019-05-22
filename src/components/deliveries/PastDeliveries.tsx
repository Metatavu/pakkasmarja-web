import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, SortedDeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Item, Grid } from "semantic-ui-react";
import Moment from "react-moment";
import ViewModal from "./ViewModal";
import strings from "src/localization/strings";
import BasicLayout from "../generic/BasicLayout";
import Api, { DeliveryQuality } from "pakkasmarja-client";
import * as _ from "lodash";
import * as moment from "moment";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveries?: DeliveriesState;
  location?: any;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  sortedDeliveriesByTime?: ArrayLike<SortedDeliveryProduct>;
  deliveryId?: string;
  viewModal: boolean;
  pageTitle?: string;
  category?: string;
  deliveryQualities?: DeliveryQuality[];
}

/**
 * Class for past deliveries list component
 */
class PastDeliveries extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      viewModal: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.deliveries) {
      return;
    }
    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const category = this.props.location.state ? this.props.location.state.category : "";
    if (category === "FRESH") {
      const freshDeliveryData: DeliveryProduct[] = this.props.deliveries.freshDeliveryData;
      const freshPastDeliveries: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => deliveryData.delivery.status === "DONE");
      const sortedDeliveriesByTime = this.sortDeliveryProducts(freshPastDeliveries);
      const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(category);

      this.setState({ sortedDeliveriesByTime, pageTitle: strings.pastFreshDeliveries, category, deliveryQualities });
    }
    if (category === "FROZEN") {
      const frozenDeliveryData: DeliveryProduct[] = this.props.deliveries.frozenDeliveryData;
      const frozenPastDeliveries: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => deliveryData.delivery.status === "DONE");
      const sortedDeliveriesByTime = this.sortDeliveryProducts(frozenPastDeliveries);
      const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(category);
      this.setState({ sortedDeliveriesByTime, pageTitle: strings.pastFrozenDeliveries, category, deliveryQualities });
    }
  }

  /**
   * Sort delivery products
   * 
   * @param deliveryProductArray deliveryProductArray
   * @returns sorted array
   */
  private sortDeliveryProducts = (deliveryProductArray: DeliveryProduct[]) => {
    const sorted : ArrayLike<SortedDeliveryProduct> = _.chain(deliveryProductArray)
    .groupBy(deliveryProduct => moment(deliveryProduct.delivery.time).format("DD.MM.YYYY"))
    .map((v, i) => {
      return {
        time: i,
        deliveryProducts: v
      }
    }).value();
    const SortedDeliveryProductArrayDesc = _.sortBy(sorted, (obj) => obj.time).reverse();
    return SortedDeliveryProductArrayDesc;
  }
  
  /**
   * Render quality
   */
  private renderQuality = (qualityId: string) => {
    if (!this.state.deliveryQualities) {
      return;
    }
    const quality: DeliveryQuality | undefined = this.state.deliveryQualities.find(quality => quality.id === qualityId);
    return quality &&
      <React.Fragment>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "auto", height: "30px", width: "30px", borderRadius: "15px", marginRight: "10px", color: "white", backgroundColor: quality.color || "grey", boxShadow: "0px 0px 3px grey" }}>
          <p style={{ fontWeight: "bold" }}>{quality.name.slice(0, 1)}</p>
        </div>
        <h4 style={{ margin: "auto", color: quality.color || "black", width: "15%" }} >{quality.name}</h4>
      </React.Fragment >;
  }

  /**
   * Render method
   */
  public render() {
    const { sortedDeliveriesByTime } = this.state;
    return (
      <BasicLayout pageTitle={this.state.pageTitle}>
        <Grid verticalAlign='middle'>
          <Grid.Row>
            <Grid.Column width={4}>
            </Grid.Column>
            <Grid.Column width={8}>
              {
                sortedDeliveriesByTime && Array.from(sortedDeliveriesByTime).map((obj) => {
                  return (
                    <React.Fragment key={obj.deliveryProducts[0].delivery.id}>
                      <div className="delivery-sort-time-container"><h3>Päivämäärä {obj.time}</h3></div>
                      <Item.Group divided>
                        {obj.deliveryProducts.map((deliveryProduct) => {
                          if (!deliveryProduct.product) {
                            return;
                          }
                          return (
                            <Item className="open-modal-element" key={deliveryProduct.delivery.id} onClick={() => { this.setState({ deliveryId: deliveryProduct.delivery.id, viewModal: true }) }}>
                              <Item.Content>
                                <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.delivery.amount} x ${deliveryProduct.product.units} ${deliveryProduct.product.unitName} `}</Item.Header>
                                <Item.Description><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Description>
                              </Item.Content>
                              {deliveryProduct.delivery.qualityId && this.renderQuality(deliveryProduct.delivery.qualityId)}
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
            <Grid.Column width={4}>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <ViewModal
          modalOpen={this.state.viewModal}
          closeModal={() => this.setState({ viewModal: false })}
          deliveryId={this.state.deliveryId || ""}
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

export default connect(mapStateToProps, mapDispatchToProps)(PastDeliveries);
