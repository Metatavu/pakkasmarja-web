import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Segment, Item, Header, Divider } from "semantic-ui-react";
import Moment from "react-moment";
import { Link } from "react-router-dom";


/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveries?: DeliveriesState;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  freshPastDeliveries: DeliveryProduct[];
  frozenPastDeliveries: DeliveryProduct[];
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
      freshPastDeliveries: [],
      frozenPastDeliveries: []

    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.deliveries) {
      return;
    }
    const frozenDeliveryData: DeliveryProduct[] = this.props.deliveries.frozenDeliveryData;
    const frozenPastDeliveries: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => deliveryData.delivery.status === "DONE");

    const freshDeliveryData: DeliveryProduct[] = this.props.deliveries.freshDeliveryData;
    const freshPastDeliveries: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => deliveryData.delivery.status === "DONE");

    this.setState({ frozenPastDeliveries, freshPastDeliveries });
  }


  /**
   * Render method
   */
  public render() {
    return (
      <React.Fragment>
        <Segment >
          <Header as='h2'>Past fresh deliveries</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.freshPastDeliveries.map((deliveryProduct) => {
                if (!deliveryProduct.product) {
                  return;
                }
                return (
                  <Item key={deliveryProduct.delivery.id} as={Link} to={`delivery/${deliveryProduct.delivery.id}`}>
                    <Item.Content>
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                      <Item.Description><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Description>
                    </Item.Content>
                  </Item>
                )
              })
            }
          </Item.Group>
        </Segment>
        <Segment >
          <Header as='h2'>Past frozen deliveries</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.frozenPastDeliveries.map((deliveryProduct) => {
                if (!deliveryProduct.product) {
                  return;
                }
                return (
                  <Item key={deliveryProduct.delivery.id} as={Link} to={`delivery/${deliveryProduct.delivery.id}`}>
                    <Item.Content >
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                      <Item.Description><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Description>
                    </Item.Content>
                  </Item>
                )
              })
            }
          </Item.Group>
        </Segment>
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
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(PastDeliveries);