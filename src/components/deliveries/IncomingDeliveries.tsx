import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Segment, Header, Divider, Item, Label, Button } from "semantic-ui-react";
import { Link } from "react-router-dom";
import Moment from "react-moment";


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
}

/**
 * Class for proposal list component
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
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = () => {
  }

  /**
   * Render method
   */
  public render() {
    return (
      <React.Fragment>
        <Button as={Link} to="createDelivery">
          Uusi toimitus
        </Button>
        <Segment >
          <Header as='h2'>Tuoretuotteet</Header>
          <Divider />
          <Item.Group divided>
            {
              this.props.deliveries && this.props.deliveries.freshDeliveryData.map((deliveryProduct) => {
                if (!deliveryProduct.product) {
                  return;
                }
                return (
                  <Item key={deliveryProduct.delivery.id} as={Link} to={`delivery/${deliveryProduct.delivery.id}`}>
                    <Item.Content>
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                      <Item.Meta><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Meta>
                      <Item.Extra>
                        <Label>
                          {
                            deliveryProduct.delivery.status
                          }
                        </Label>
                      </Item.Extra>
                    </Item.Content>
                  </Item>
                )
              })
            }
          </Item.Group>
        </Segment>
        <Segment >
          <Header as='h2'>Pakastetuotteet</Header>
          <Divider />
          <Item.Group divided>
            {
              this.props.deliveries && this.props.deliveries.frozenDeliveryData.map((deliveryProduct) => {
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

export default connect(mapStateToProps, mapDispatchToProps)(IncomingDeliveries);