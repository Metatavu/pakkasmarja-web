import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, SortedDeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Item, Button, Grid } from "semantic-ui-react";
import Moment from "react-moment";
import ProposalAcceptModal from "./ProposalAcceptModal";
import strings from "src/localization/strings";
import BasicLayout from "../generic/BasicLayout";
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
  proposals: DeliveryProduct[];
  sortedProposalsByTime?: ArrayLike<SortedDeliveryProduct>;
  proposalAcceptModal: boolean;
  deliveryId?: string;
  pageTitle?: string;
  category?: string;
}

/**
 * Class for proposals view component
 */
class ProposalsView extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      proposals: [],
      proposalAcceptModal: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public componentDidMount = async () => {
    const category = this.props.location.state ? this.props.location.state.category : "";
    await this.setState({ category });
    this.loadData();
  }

  /**
   * Load data
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.deliveries) {
      return;
    }
    if (this.state.category === "FRESH") {
      const freshDeliveryData: DeliveryProduct[] = await this.props.deliveries.freshDeliveryData;
      const freshProposals: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => deliveryData.delivery.status === "PROPOSAL");
      const sortedProposalsByTime = this.sortDeliveryProducts(freshProposals);
      this.setState({ sortedProposalsByTime, proposals: freshProposals, pageTitle: strings.freshProposals });
    }
    if (this.state.category === "FROZEN") {
      const frozenDeliveryData: DeliveryProduct[] = await this.props.deliveries.frozenDeliveryData;
      const frozenProposals: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => deliveryData.delivery.status === "PROPOSAL");
      const sortedProposalsByTime = this.sortDeliveryProducts(frozenProposals);
      this.setState({ sortedProposalsByTime, proposals: frozenProposals, pageTitle: strings.frozenProposals });
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
   * Render method
   */
  public render() {
    const { sortedProposalsByTime } = this.state;
    return (
      <BasicLayout pageTitle={this.state.pageTitle}>
        <Grid verticalAlign='middle'>
          <Grid.Row>
            <Grid.Column width={4}>
            </Grid.Column>
            <Grid.Column width={8}>
              {
                sortedProposalsByTime && Array.from(sortedProposalsByTime).map((obj) => {
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
                                <Item.Content>
                                  <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.delivery.amount} x ${deliveryProduct.product.units} ${deliveryProduct.product.unitName} `}</Item.Header>
                                  <Item.Description><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Description>
                                </Item.Content>
                                <Button style={{ maxHeight: "37px", marginBottom: "1%" }} color="red" floated="right" onClick={() => this.setState({ deliveryId: deliveryProduct.delivery.id, proposalAcceptModal: true })}>
                                  {strings.check}
                                </Button>
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
        <ProposalAcceptModal
          modalOpen={this.state.proposalAcceptModal}
          closeModal={() => this.setState({ proposalAcceptModal: false })}
          deliveryId={this.state.deliveryId || ""}
          loadData={this.loadData}
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
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ProposalsView);
