import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Item, Header } from "semantic-ui-react";
import Moment from "react-moment";
import ViewModal from "./ViewModal";
import strings from "src/localization/strings";
import BasicLayout from "../generic/BasicLayout";

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
  pastDeliveries: DeliveryProduct[];
  deliveryId?: string;
  viewModal: boolean;
  pageTitle?: string;
  category?: string;
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
      pastDeliveries: [],
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

    const category = this.props.location.state ? this.props.location.state.category : "";
    if (category === "FRESH") {
      const freshDeliveryData: DeliveryProduct[] = this.props.deliveries.freshDeliveryData;
      const freshPastDeliveries: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => deliveryData.delivery.status === "DONE");
      this.setState({ pastDeliveries: freshPastDeliveries, pageTitle: strings.pastFreshDeliveries, category });
    }
    if (category === "FROZEN") {
      const frozenDeliveryData: DeliveryProduct[] = this.props.deliveries.frozenDeliveryData;
      const frozenPastDeliveries: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => deliveryData.delivery.status === "DONE");
      this.setState({ pastDeliveries: frozenPastDeliveries, pageTitle : strings.pastFrozenDeliveries, category });
    }
  }

  /**
   * Render method
   */
  public render() {
    return (
      <BasicLayout pageTitle={this.state.pageTitle}>
        <Item.Group divided>
          {
            this.state.pastDeliveries.map((deliveryProduct) => {
              if (!deliveryProduct.product) {
                return;
              }
              return (
                <Item className="open-modal-element" key={deliveryProduct.delivery.id} onClick={() => { this.setState({ deliveryId: deliveryProduct.delivery.id, viewModal: true }) }}>
                  <Item.Content>
                    <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                    <Item.Description><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Description>
                  </Item.Content>
                  <Header style={{ margin: "auto", marginRight: 50 }} as="h3">{strings.deliveried}</Header>
                </Item>
              )
            })
          }
        </Item.Group>
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
