import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, WeekDeliveryPredictionTableData } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Segment, Item, Header, Divider, Button } from "semantic-ui-react";
import Api, { WeekDeliveryPrediction, ItemGroup } from "pakkasmarja-client";
import { Link } from "react-router-dom";
import WeekDeliveryPredictionViewModal from "./WeekDeliveryPredictionViewModal";
import * as _ from "lodash";
import strings from "src/localization/strings";


/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  freshWeekDeliveryPredictions: WeekDeliveryPredictionTableData[];
  frozenWeekDeliveryPredictions: WeekDeliveryPredictionTableData[];
  predictionDataForModal?: WeekDeliveryPredictionTableData;
  modal: boolean;
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
      modal: false,
      freshWeekDeliveryPredictions: [],
      frozenWeekDeliveryPredictions: []
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
    const weekDeliveryPredictionState: WeekDeliveryPredictionTableData[] = [];
    weekDeliveryPredictions.forEach((weekDeliveryPrediction) => {
      const itemGroup = itemGroups.find(itemGroup => itemGroup.id === weekDeliveryPrediction.itemGroupId);
      weekDeliveryPredictionState.push({
        weekDeliveryPrediction: weekDeliveryPrediction,
        itemGroup: itemGroup ? itemGroup : {}
      });
    });
    let freshWeekDeliveryPredictions: WeekDeliveryPredictionTableData[] = weekDeliveryPredictionState.filter((prediction) => prediction.itemGroup.category === "FRESH");
    freshWeekDeliveryPredictions = _.reverse(_.sortBy(freshWeekDeliveryPredictions, ['weekDeliveryPrediction.weekNumber']));
    let frozenWeekDeliveryPredictions: WeekDeliveryPredictionTableData[] = weekDeliveryPredictionState.filter((prediction) => prediction.itemGroup.category === "FROZEN");
    frozenWeekDeliveryPredictions = _.reverse(_.sortBy(frozenWeekDeliveryPredictions, ['weekDeliveryPrediction.weekNumber']));

    this.setState({ freshWeekDeliveryPredictions, frozenWeekDeliveryPredictions });
  }

  /**
   * Renders list items
   * 
   * @param predictionTableData predictionTableData
   */
  private renderListItem = (predictionTableData: WeekDeliveryPredictionTableData) => {
    return (
      <Item className="open-modal-element" key={predictionTableData.weekDeliveryPrediction.id} onClick={() => this.setState({ modal: true, predictionDataForModal: predictionTableData })}>
        <Item.Content>
          <Item.Header >{`${predictionTableData.itemGroup.displayName} ${predictionTableData.weekDeliveryPrediction.amount} KG`}</Item.Header>
          <Item.Description >{strings.week} {predictionTableData.weekDeliveryPrediction.weekNumber}</Item.Description>
        </Item.Content>
        <Header style={{ margin: "auto", marginRight: 50 }} as="h3">{strings.open}</Header>
      </Item>
    );
  }

  /**
   * Render method
   */
  public render() {
    return (
      <React.Fragment>
        <Button style={{ marginTop: 20 }} color="red" attached="top" as={Link} to="createWeekDeliveryPrediction/FRESH">
          {strings.newFreshWeekDeliveryPrediction}
        </Button>
        <Segment attached>
          <Header as='h2'>{strings.freshWeekDeliveryPredictions}</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.freshWeekDeliveryPredictions.map((predictionTableData: WeekDeliveryPredictionTableData) => {
                return this.renderListItem(predictionTableData)
              })
            }
          </Item.Group>
        </Segment>
        <Button style={{ marginTop: 20 }} color="red" attached="top" as={Link} to="createWeekDeliveryPrediction/FROZEN">
          {strings.newFrozenWeekDeliveryPrediction}
        </Button>
        <Segment attached>
          <Header as='h2'>{strings.frozenWeekDeliveryPredictions}</Header>
          <Divider />
          <Item.Group divided>
            {
              this.state.frozenWeekDeliveryPredictions.map((predictionTableData: WeekDeliveryPredictionTableData) => {
                return this.renderListItem(predictionTableData)
              })
            }
          </Item.Group>
        </Segment>
        <WeekDeliveryPredictionViewModal
          modalOpen={this.state.modal}
          closeModal={() => this.setState({ modal: false })}
          data={this.state.predictionDataForModal}
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
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(WeekDeliveryPredictions);
