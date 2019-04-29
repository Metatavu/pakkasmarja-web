import * as React from "react";
import * as actions from "../../actions";
import { StoreState, DeliveryDataValue, Options } from "src/types";
import Api, { ItemGroupCategory, ItemGroup, WeekDeliveryPredictionDays, WeekDeliveryPrediction } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Header, Form, Input, Button, Divider, Dropdown, Checkbox, CheckboxProps, Dimmer, Loader } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import "react-datepicker/dist/react-datepicker.css";
import { Link } from "react-router-dom";
import * as moment from "moment";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
}

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean;
  loading: boolean;
  category: string;
  redirect: boolean;
  amount: number;
  lastWeeksDeliveryPredictionTotalAmount: number;
  averageDailyAmount: number;
  percentageAmount: string;
  filteredItemGroups: ItemGroup[];
  weekdays: WeekDeliveryPredictionDays;
  selectedItemGroupId?: string;
}

/**
 * Class for create week delivery prediction component
 */
class CreateWeekDeliveryPrediction extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      redirect: false,
      modalOpen: false,
      loading: false,
      category: "",
      amount: 0,
      lastWeeksDeliveryPredictionTotalAmount: 0,
      averageDailyAmount: 0,
      percentageAmount: "0",
      filteredItemGroups: [],
      weekdays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      }
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loading: true });
    await this.loadItemGroups();
    this.setState({ loading: false });
  }

  /**
   * Load item groups
   */
  private loadItemGroups = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const category: ItemGroupCategory = this.props.match.params.category;
    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroups = await itemGroupsService.listItemGroups();
    await this.setLastWeeksTotal();
    const filteredItemGroups: ItemGroup[] = itemGroups.filter((item) => item.category == category);
    this.setState({ filteredItemGroups, category });
  }

  /**
   * Handle inputchange
   * 
   * @param key key
   * @param value value
   */
  private handleInputChange = (key: string, value: DeliveryDataValue) => {
    const state: State = this.state;
    state[key] = value;
    this.setState(state);

    let percentageAmount: string = "0";
    const averageDailyAmount: number = Math.round(this.state.amount / 7);
    if (this.state.lastWeeksDeliveryPredictionTotalAmount > 0 && this.state.amount > 0) {
      percentageAmount = ((this.state.amount / this.state.lastWeeksDeliveryPredictionTotalAmount) * 100).toFixed(2);
    }

    this.setState({ averageDailyAmount, percentageAmount });
  }

  /**
   * Render drop down
   * 
   * @param options options
   * @param placeholder placeholder
   * @param key key
   */
  private renderDropDown = (options: Options[], placeholder: string, key: string) => {
    if (options.length <= 0) {
      return <Dropdown fluid />;
    }
    const value = this.state[key];

    return (
      <Dropdown
        selection
        fluid
        placeholder={placeholder}
        value={value}
        options={options}
        onChange={(event, data) => { this.handleInputChange(key, data.value) }}
      />
    );
  }

  /**
   * Handle checkbox value change
   * 
   * @param checkboxProps checkboxProps
   */
  private handleCheckValue = (checkboxProps: CheckboxProps) => {
    const weekdays: WeekDeliveryPredictionDays = { ... this.state.weekdays };
    const key: string = checkboxProps.name || "";
    const value: boolean = checkboxProps.checked || false;
    weekdays[key] = value;
    this.setState({ weekdays });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedItemGroupId) {
      return;
    }

    const weekDeliveryPredictionsService = Api.getWeekDeliveryPredictionsService(this.props.keycloak.token);
    const weekDeliveryPrediction: WeekDeliveryPrediction = {
      itemGroupId: this.state.selectedItemGroupId,
      userId: this.props.keycloak.subject || "",
      amount: this.state.amount,
      year: moment().year(),
      weekNumber: Number(moment().format("W")),
      days: this.state.weekdays
    }
    await weekDeliveryPredictionsService.createWeekDeliveryPrediction(weekDeliveryPrediction);
    this.setState({ redirect: true });
  }

  /**
   * Set last weeks total to state
   */
  private setLastWeeksTotal = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const lastWeekNumber: number = moment().subtract(1, "weeks").week();
    const weekDeliveryPredictionService = await Api.getWeekDeliveryPredictionsService(this.props.keycloak.token);
    const filteredByWeekNumber = await weekDeliveryPredictionService.listWeekDeliveryPredictions(undefined, undefined, this.props.keycloak.subject, lastWeekNumber);

    filteredByWeekNumber.forEach((weekDeliveryPrediction) => {
      const amount: number = weekDeliveryPrediction.amount;
      const totalAmount = this.state.lastWeeksDeliveryPredictionTotalAmount + amount;
      this.setState({ lastWeeksDeliveryPredictionTotalAmount: totalAmount });
    });
  }

  /**
   * Return localized day name
   * 
   * @param dayname dayname
   * @returns label
   */
  private localizeDayName = (dayname: string) => {
    switch (dayname) {
      case 'monday':
        return 'Maanantai';
      case 'tuesday':
        return 'Tiistai';
      case 'wednesday':
        return 'Keskiviikko';
      case 'thursday':
        return 'Torstai';
      case 'friday':
        return 'Perjantai';
      case 'saturday':
        return 'Lauantai';
      case 'sunday':
        return 'Sunnuntai';
      default:
        return '';
    }
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to={{
        pathname: '/deliveries',
        state: { activeItem: 'weekDeliveryPredictions' }
      }} />;
    }

    if (this.state.loading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              {strings.loading}
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    const itemGroupOptions: Options[] = this.state.filteredItemGroups.map((itemGroup) => {
      return {
        key: itemGroup.id,
        text: itemGroup.name,
        value: itemGroup.id
      };
    });

    return (
      <BasicLayout>
        <Header as="h2">
          {this.state.category === "FRESH" ? strings.newFreshWeekDeliveryPrediction : strings.newFrozenWeekDeliveryPrediction}
        </Header>
        <p>{strings.formatString(strings.lastWeekDeliveries, this.state.lastWeeksDeliveryPredictionTotalAmount)}</p>
        <Form>
          <Form.Field>
            <label>{strings.product}</label>
            {this.renderDropDown(itemGroupOptions, strings.product, "selectedItemGroupId")}
          </Form.Field>
          <Form.Field>
            <Header as="h4">{strings.nextWeekPrediction}</Header>
            <Input
              type="number"
              placeholder={strings.amount}
              value={this.state.amount}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("amount", event.currentTarget.value)
              }}
            />
            <p style={{ marginTop: "1%" }}>{strings.formatString(strings.dailyAverage, this.state.averageDailyAmount)}
              <br />
              {strings.formatString(strings.changeComparedToLastWeek, this.state.percentageAmount)}
            </p>
          </Form.Field>
          <Header as="h4">{strings.deliveryDay}</Header>
          {
            Object.keys(this.state.weekdays).map((day) => {
              const label = this.localizeDayName(day);
              return <Form.Field key={day}><Checkbox label={label} name={day} onChange={(e, checkBoxProps) => this.handleCheckValue(checkBoxProps)} /></Form.Field>;
            })
          }
          <Divider />
          <Button.Group floated="right" >
            <Button
              as={Link}
              to={{
                pathname: '/deliveries',
                state: { activeItem: 'weekDeliveryPredictions' }
              }}
              inverted
              color="red">{strings.back}</Button>
            <Button.Or text="" />
            <Button onClick={this.handleDeliverySubmit} color="red">
              {this.state.category === "FRESH" ? strings.newFreshWeekDeliveryPrediction : strings.newFrozenWeekDeliveryPrediction}
            </Button>
          </Button.Group>
        </Form>
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
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateWeekDeliveryPrediction);
