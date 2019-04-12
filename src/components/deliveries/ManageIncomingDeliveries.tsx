import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Segment, Header, Divider, Item } from "semantic-ui-react";
import Moment from "react-moment";
import ViewModal from "./ViewModal";
import BasicLayout from "../generic/BasicLayout";
import { Link } from "react-router-dom";


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
class ManageIncomingDeliveries extends React.Component<Props, State> {

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
    const filterCondition = ["DELIVERY"];
    const frozenDeliveryData: DeliveryProduct[] = this.props.deliveries.frozenDeliveryData;
    const frozenDeliveries: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => filterCondition.includes(deliveryData.delivery.status));
    const freshDeliveryData: DeliveryProduct[] = this.props.deliveries.freshDeliveryData;
    const freshDeliveries: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => filterCondition.includes(deliveryData.delivery.status));
    this.setState({ frozenDeliveries, freshDeliveries });
  }

  /**
   * Render method
   */
  public render() {
    return (
      <BasicLayout>
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
                  <Item className="open-modal-element" key={deliveryProduct.delivery.id}>
                    <Item.Content onClick={() => { this.setState({ deliveryId: deliveryProduct.delivery.id, viewModal: true }) }}>
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                      <Item.Meta><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Meta>
                    </Item.Content>
                    <Header style={{ margin: "auto", marginRight: 50 }} as={Link} to={`manageIncomingDeliveries/${deliveryProduct.delivery.id}`}>Avaa</Header>
                  </Item>
                )
              })
            }
          </Item.Group>
        </Segment>
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
                  <Item className="open-modal-element" key={deliveryProduct.delivery.id}>
                    <Item.Content>
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                      <Item.Meta><Moment format="DD.MM.YYYY HH:mm">{deliveryProduct.delivery.time.toString()}</Moment></Item.Meta>
                    </Item.Content>
                    <Header style={{ margin: "auto", marginRight: 50 }} as={Link} to={`manageIncomingDeliveries/${deliveryProduct.delivery.id}`}>Avaa</Header>
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

export default connect(mapStateToProps, mapDispatchToProps)(ManageIncomingDeliveries);
