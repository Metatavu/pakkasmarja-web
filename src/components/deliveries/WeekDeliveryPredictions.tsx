import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, WeekDeliveryPredictionTableData } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Item, Header } from "semantic-ui-react";
import Api, { WeekDeliveryPrediction, ItemGroup } from "pakkasmarja-client";
import { Redirect } from "react-router-dom";
import WeekDeliveryPredictionViewModal from "./WeekDeliveryPredictionViewModal";
import * as _ from "lodash";
import strings from "src/localization/strings";
import BasicLayout from "../generic/BasicLayout";


/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  location?: any;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  weekDeliveryPredictions: WeekDeliveryPredictionTableData[];
  predictionDataForModal?: WeekDeliveryPredictionTableData;
  modal: boolean;
  pageTitle?: string;
  category?: string;
  redirectTo?: string;
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
      weekDeliveryPredictions: []
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const category = this.props.location.state ? this.props.location.state.category : "";
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
    if (category === "FRESH") {
      let freshWeekDeliveryPredictions: WeekDeliveryPredictionTableData[] = weekDeliveryPredictionState.filter((prediction) => prediction.itemGroup.category === "FRESH");
      freshWeekDeliveryPredictions = _.reverse(_.sortBy(freshWeekDeliveryPredictions, ['weekDeliveryPrediction.weekNumber']));
      this.setState({ weekDeliveryPredictions: freshWeekDeliveryPredictions, category, pageTitle : strings.freshWeekDeliveryPredictions });
    }
    if (category === "FROZEN") {
      let frozenWeekDeliveryPredictions: WeekDeliveryPredictionTableData[] = weekDeliveryPredictionState.filter((prediction) => prediction.itemGroup.category === "FROZEN");
      frozenWeekDeliveryPredictions = _.reverse(_.sortBy(frozenWeekDeliveryPredictions, ['weekDeliveryPrediction.weekNumber']));
      this.setState({ weekDeliveryPredictions: frozenWeekDeliveryPredictions, category, pageTitle : strings.frozenWeekDeliveryPredictions });
    }
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
   * redirects to another page
   */
  private redirectTo = () => {
    this.state.category === "FRESH" 
    ? this.setState({redirectTo:"/createWeekDeliveryPrediction/FRESH"}) 
    : this.setState({redirectTo:"/createWeekDeliveryPrediction/FROZEN"})
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirectTo) {
      return (
        <Redirect to={this.state.redirectTo} />
      );
    }
    
    return (
      <BasicLayout
        pageTitle={this.state.pageTitle}
        topBarButtonText={this.state.category === "FRESH" ? strings.createNewFreshPrediction : strings.createNewFrozenPrediction}
        onTopBarButtonClick={this.redirectTo}>
        <Item.Group divided>
          {
            this.state.weekDeliveryPredictions.map((predictionTableData: WeekDeliveryPredictionTableData) => {
              return this.renderListItem(predictionTableData)
            })
          }
        </Item.Group>
        <WeekDeliveryPredictionViewModal
          modalOpen={this.state.modal}
          closeModal={() => this.setState({ modal: false })}
          data={this.state.predictionDataForModal}
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

export default connect(mapStateToProps, mapDispatchToProps)(WeekDeliveryPredictions);
