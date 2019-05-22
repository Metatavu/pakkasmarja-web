import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, DeliveryProduct, DeliveriesState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { Product } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Grid, Header, Icon, SemanticICONS, Menu } from "semantic-ui-react";
import { Delivery } from "pakkasmarja-client";
import strings from "src/localization/strings";
import { Redirect } from "react-router";
import * as _ from "lodash";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
  location?: any;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  itemGroups?: ItemGroup[];
  activeItem?: string;
  tabActiveItem: string;
  pageTitle: string;
  redirect: boolean;
  redirectTo?: string;
  redirectObj?: {};
  proposalCount?: number;
  incomingDeliveriesCount?: number;
  deliveries?: DeliveriesState;
}

/**
 * Class for deliveries screen component
 */
class DeliveriesScreen extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      pageTitle: "toimitukset",
      tabActiveItem: "FRESH",
      redirect: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const activeItem = this.props.location.state ? this.props.location.state.activeItem : "";
    this.setState({ activeItem });
    await this.loadDeliveriesData();
    this.setTabCounts();
  }

  /**
   * Component did update life-sycle event
   */
  public componentDidUpdate = (prevProps: Props, prevState: State) => {
    if (prevState.tabActiveItem != this.state.tabActiveItem) {
      this.setTabCounts();
    }
  }

  /**
   * Sets tabs counts
   */
  private setTabCounts = () => {
    const deliveries = this.state.deliveries;
    if (deliveries) {
      if (this.state.tabActiveItem === "FRESH") {
        const proposalCount = _.filter(deliveries.freshDeliveryData, ({ delivery }) => delivery.status === "PROPOSAL").length;
        const incomingDeliveriesCount = _.filter(deliveries.freshDeliveryData, ({ delivery }) => delivery.status === "PLANNED").length;
        this.setState({ proposalCount, incomingDeliveriesCount });
      } else {
        const proposalCount = _.filter(deliveries.frozenDeliveryData, ({ delivery }) => delivery.status === "PROPOSAL").length;
        const incomingDeliveriesCount = _.filter(deliveries.frozenDeliveryData, ({ delivery }) => delivery.status === "PLANNED").length;
        this.setState({ proposalCount, incomingDeliveriesCount });
      }
    }
  }

  /**
   * Load deliveries
   */
  private loadDeliveriesData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const userId = this.props.keycloak.subject;

    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const productsService = await Api.getProductsService(this.props.keycloak.token);

    const freshDeliveries: Delivery[] = await deliveriesService.listDeliveries(userId, undefined, "FRESH", undefined, undefined, undefined, undefined, undefined, 0, 200);
    const frozenDeliveries: Delivery[] = await deliveriesService.listDeliveries(userId, undefined, "FROZEN", undefined, undefined, undefined, undefined, undefined, 0, 200);
    const products: Product[] = await productsService.listProducts(undefined, undefined, undefined, undefined, 100);

    const freshDeliveriesAndProducts: DeliveryProduct[] = freshDeliveries.map((delivery) => {
      return {
        delivery: delivery,
        product: products.find(product => product.id === delivery.productId)
      };
    });

    const frozenDeliveriesAndProducts: DeliveryProduct[] = frozenDeliveries.map((delivery) => {
      return {
        delivery: delivery,
        product: products.find(product => product.id === delivery.productId)
      };
    });

    const deliveriesState: DeliveriesState = {
      freshDeliveryData: freshDeliveriesAndProducts,
      frozenDeliveryData: frozenDeliveriesAndProducts
    };

    this.setState({ deliveries: deliveriesState });
    this.props.deliveriesLoaded && this.props.deliveriesLoaded(deliveriesState);
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect && this.state.redirectTo) {
      return (
        <Redirect to={{
          pathname: `${this.state.redirectTo}`,
          state: this.state.redirectObj
        }} />
      );
    }
    const { tabActiveItem } = this.state;
    const tabs: { value: string, pageTitle: string, src: SemanticICONS, count?: number }[] = [
      {
        value: "proposals",
        pageTitle: "Ehdotukset",
        src: "edit outline",
        count: this.state.proposalCount && this.state.proposalCount
      },
      {
        value: "weekDeliveryPredictions",
        pageTitle: "Viikkoennusteet",
        src: "calendar alternate outline"
      },
      {
        value: "incomingDeliveries",
        pageTitle: "Tulevat toimitukset",
        src: "truck",
        count: this.state.incomingDeliveriesCount && this.state.incomingDeliveriesCount
      },
      {
        value: "pastDeliveries",
        pageTitle: "Tehdyt toimitukset",
        src: "check circle outline"
      }
    ]
    return (
      <BasicLayout pageTitle={`${tabActiveItem === "FRESH" ? "Tuore, " : "Pakaste, "} ${this.state.pageTitle.toLowerCase()}`}>
        <Grid>
          <Grid.Column width={4}></Grid.Column>
          <Grid.Column width={8}>
            <Menu color="red" pointing secondary widths={2}>
              <Menu.Item name={strings.fresh} active={tabActiveItem === 'FRESH'} onClick={() => this.setState({ tabActiveItem: "FRESH" })} />
              <Menu.Item name={strings.frozen} active={tabActiveItem === 'FROZEN'} onClick={() => this.setState({ tabActiveItem: "FROZEN" })} />
            </Menu>
          </Grid.Column>
          <Grid.Column width={4}></Grid.Column>
        </Grid>
        <Grid verticalAlign='middle'>
          {
            tabs.map((tab) => {
              return (
                <Grid.Row key={tab.value}>
                  <Grid.Column width={4}>
                  </Grid.Column>
                  <Grid.Column textAlign="right" width={2}>
                    <Icon color="red" name={tab.src} size='huge' />
                  </Grid.Column>
                  <Grid.Column style={{ height: 40 }} width={6} className="open-modal-element" onClick={() => this.handleTabChange(tab.value)}>
                    <Header style={{ display: "inline" }}>{tab.pageTitle}</Header>
                    {
                      tab.count ?
                        <div className="delivery-count-container"><p>{tab.count}</p></div>
                        : null
                    }
                  </Grid.Column>
                  <Grid.Column width={4}>
                  </Grid.Column>
                </Grid.Row>
              );
            })
          }
        </Grid>
      </BasicLayout>
    );
  }

  /**
   * Handles tab change
   */
  private handleTabChange = (value: string) => {
    this.setState({ redirectTo: value, redirect: true, redirectObj: { category: this.state.tabActiveItem } });
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
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries)),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(DeliveriesScreen);
