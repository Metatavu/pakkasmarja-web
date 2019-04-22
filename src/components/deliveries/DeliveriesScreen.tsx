import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, DeliveryProduct, DeliveriesState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import Api, { Product } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Menu } from "semantic-ui-react";
import PastDeliveries from "./PastDeliveries"
import { Delivery } from "pakkasmarja-client"
import ProposalsView from "./ProposalsView";
import WeekDeliveryPredictions from "./WeekDeliveryPredictions";
import IncomingDeliveries from "./IncomingDeliveries";

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
  deliveries: Delivery[];
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
      deliveries: []
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

    this.props.deliveriesLoaded && this.props.deliveriesLoaded(deliveriesState);
  }

  /**
   * Handle menu click
   * 
   * @param value value
   */
  private handleMenuItemClick = (value: string) => this.setState({ activeItem: value })

  /**
   * Render method
   */
  public render() {
    const { activeItem } = this.state
    return (
      <BasicLayout>
        <Menu fluid widths={4} attached='top' inverted color="red">
          <Menu.Item name='Ehdotukset' active={activeItem === 'proposals'} onClick={() => this.handleMenuItemClick("proposals")} />
          <Menu.Item color="black" name='Viikkoennusteet' active={activeItem === 'weekDeliveryPredictions'} onClick={() => this.handleMenuItemClick("weekDeliveryPredictions")} />
          <Menu.Item color="black" name='Tulevat toimitukset' active={activeItem === 'incomingDeliveries'} onClick={() => this.handleMenuItemClick("incomingDeliveries")} />
          <Menu.Item color="black" name='Tehdyt toimitukset' active={activeItem === 'pastDeliveries'} onClick={() => this.handleMenuItemClick("pastDeliveries")} />
        </Menu>
        {
          this.state.activeItem === "proposals" && <ProposalsView />
        }
        {
          this.state.activeItem === "weekDeliveryPredictions" && <WeekDeliveryPredictions />
        }
        {
          this.state.activeItem === "incomingDeliveries" && <IncomingDeliveries />
        }
        {
          this.state.activeItem === "pastDeliveries" && <PastDeliveries />
        }
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
