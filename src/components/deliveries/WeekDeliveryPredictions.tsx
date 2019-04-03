import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, WeekDeliveryPredictionTableData } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Segment, Item, Header, Divider } from "semantic-ui-react";
import Api, { WeekDeliveryPrediction, ItemGroup } from "pakkasmarja-client";
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
  freshWeekDeliveryPredictions: DeliveryProduct[];
  frozenWeekDeliveryPredictions: DeliveryProduct[];
  weekDeliveryPredictionTableData: WeekDeliveryPredictionTableData[];
}

/**
 * Class week delivery predictions list component
 */
class WeekDeliveryPredictions extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      freshWeekDeliveryPredictions: [],
      frozenWeekDeliveryPredictions: [],
      weekDeliveryPredictionTableData: []
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const userId = this.props.keycloak.subject;

    const weekDeliveryPredictionsService = Api.getWeekDeliveryPredictionsService(this.props.keycloak.token);
    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);

    const weekDeliveryPredictions: WeekDeliveryPrediction[] = await weekDeliveryPredictionsService.listWeekDeliveryPredictions(undefined, undefined, userId, undefined, undefined, 0, 100);
    const itemGroups: ItemGroup[] = await itemGroupsService.listItemGroups();

    weekDeliveryPredictions.forEach((weekDeliveryPrediction) => {
      const weekDeliveryPredictionState: WeekDeliveryPredictionTableData[] = this.state.weekDeliveryPredictionTableData;
      const itemGroup = itemGroups.find(itemGroup => itemGroup.id === weekDeliveryPrediction.itemGroupId);
      weekDeliveryPredictionState.push({
        weekDeliveryPrediction: weekDeliveryPrediction,
        itemGroup: itemGroup ? itemGroup : {}
      });
      this.setState({ weekDeliveryPredictionTableData: weekDeliveryPredictionState });
    });
  }

  /**
   * Renders list items
   * 
   * @param predictionTableData predictionTableData
   */
  private renderListItem = (predictionTableData: WeekDeliveryPredictionTableData) => {
    return (
      <Item 
        key={predictionTableData.weekDeliveryPrediction.id} 
        as={Link} to={`weekDeliveryPredictions/${predictionTableData.weekDeliveryPrediction.id}`}>
        <Item.Content>
          <Item.Header>{`${predictionTableData.itemGroup.displayName} ${predictionTableData.weekDeliveryPrediction.amount} KG`}</Item.Header>
          <Item.Description>Lorem ipsum</Item.Description>
        </Item.Content>
      </Item>
    );
  }

  /**
   * Render method
   */
  public render() {
    return (
      <React.Fragment>
        <Segment >
          <Header as='h2'>Tuoretuotteet</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.weekDeliveryPredictionTableData.map((predictionTableData: WeekDeliveryPredictionTableData) => {
                return this.renderListItem(predictionTableData)
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

export default connect(mapStateToProps, mapDispatchToProps)(WeekDeliveryPredictions);
