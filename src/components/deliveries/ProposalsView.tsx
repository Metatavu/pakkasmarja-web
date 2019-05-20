import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Segment, Item, Header, Divider, Button } from "semantic-ui-react";
import Moment from "react-moment";
import ProposalAcceptModal from "./ProposalAcceptModal";
import strings from "src/localization/strings";

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
  freshProposals: DeliveryProduct[];
  frozenProposals: DeliveryProduct[];
  proposalAcceptModal: boolean;
  deliveryId?: string;
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
      freshProposals: [],
      frozenProposals: [],
      proposalAcceptModal: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    this.loadData();
  }

  /**
   * Load data
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.deliveries) {
      return;
    }
    const frozenDeliveryData: DeliveryProduct[] = await this.props.deliveries.frozenDeliveryData;
    const frozenProposals: DeliveryProduct[] = frozenDeliveryData.filter(deliveryData => deliveryData.delivery.status === "PROPOSAL");
    const freshDeliveryData: DeliveryProduct[] = await this.props.deliveries.freshDeliveryData;
    const freshProposals: DeliveryProduct[] = freshDeliveryData.filter(deliveryData => deliveryData.delivery.status === "PROPOSAL");

    this.setState({ frozenProposals, freshProposals });
  }

  /**
   * Render method
   */
  public render() {
    return (
      <React.Fragment>
        <Segment >
          <Header as='h2'>{strings.freshProposals}</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.freshProposals.map((deliveryProduct) => {
                if (!deliveryProduct.product) {
                  return;
                }
                return (
                  <Item key={deliveryProduct.delivery.id}>
                    <Item.Content>
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
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
        </Segment>
        <Segment >
          <Header as='h2'>{strings.frozenProposals}</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.frozenProposals.map((deliveryProduct) => {
                if (!deliveryProduct.product) {
                  return;
                }
                return (
                  <Item key={deliveryProduct.delivery.id}>
                    <Item.Content >
                      <Item.Header>{`${deliveryProduct.product.name} ${deliveryProduct.product.unitSize} G x ${deliveryProduct.product.units}`}</Item.Header>
                      <Item.Description>
                        <Moment format="DD.MM.YYYY HH:mm">
                          {deliveryProduct.delivery.time.toString()}
                        </Moment>
                      </Item.Description>
                    </Item.Content>
                    <Button style={{ maxHeight: "37px", marginBottom: "1%" }} floated="right" color="red" onClick={() => this.setState({ deliveryId: deliveryProduct.delivery.id, proposalAcceptModal: true })}>
                      {strings.check}
                    </Button>
                  </Item>
                )
              })
            }
          </Item.Group>
        </Segment>
        <ProposalAcceptModal
          modalOpen={this.state.proposalAcceptModal}
          closeModal={() => this.setState({ proposalAcceptModal: false })}
          deliveryId={this.state.deliveryId || ""}
          loadData={this.loadData}
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

export default connect(mapStateToProps, mapDispatchToProps)(ProposalsView);
