import * as React from "react";
import * as actions from "../../actions";
import { StoreState, Options } from "src/types";
import Api, { ItemGroupCategory, ItemGroup, WeekDeliveryPredictionDays, WeekDeliveryPrediction } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Header, Form, Input, Button, Divider, Dropdown, Checkbox, CheckboxProps, Dimmer, Loader } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import "react-datepicker/dist/react-datepicker.css";
import { Link } from "react-router-dom";
import * as moment from "moment";
import strings from "src/localization/strings";
import * as _ from "lodash";
import AsyncButton from "../generic/asynchronous-button";

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
    const itemGroups = await itemGroupsService.listItemGroups(this.props.keycloak.subject);
    const filteredItemGroups: ItemGroup[] = itemGroups.filter((item) => item.category == category);
    this.setState({ filteredItemGroups, category });
  }

  /**
   * Handle amount change
   * 
   * @param value value
   */
  private handleAmountChange = (value: number) => {
    const averageDailyAmount: number = Math.round(value / 7);
    this.setState({ amount: value, averageDailyAmount }, () => {
      this.calculatePercentage();
    })
  }

  /**
   * Handle inputchange
   * 
   * @param itemGroupId
   */
  private handleItemGroupChange = (value: string) => {
    this.setState({ amount: 0, averageDailyAmount: 0, selectedItemGroupId: value }, () => {
      this.setLastWeeksTotal();
      this.calculatePercentage();
    })
  }

  /**
   * Calculate percentage
   */
  private calculatePercentage = (inputValue?: number) => {
    const value = inputValue || this.state.amount;
    let percentageAmount: string = "0";
    const lastWeeksAmount = this.state.lastWeeksDeliveryPredictionTotalAmount > 0 ? this.state.lastWeeksDeliveryPredictionTotalAmount : 1;
    if (value > 0) {
      lastWeeksAmount === 1 ? percentageAmount = value.toFixed(2) : percentageAmount = ((value / lastWeeksAmount) * 100 - 100).toFixed(2);
    }
    this.setState({ percentageAmount });
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
        onChange={(event, data) => { this.handleItemGroupChange(data.value as string) }}
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
   * Handles submit
   */
  private handleSubmit = async () => {
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
    const filteredByWeekNumber = await weekDeliveryPredictionService.listWeekDeliveryPredictions(this.state.selectedItemGroupId, undefined, this.props.keycloak.subject, lastWeekNumber, moment().year(), undefined, 999);

    const lastWeeksDeliveryPredictionTotalAmount = _.sumBy(filteredByWeekNumber, prediction => prediction.amount);
    this.setState({ lastWeeksDeliveryPredictionTotalAmount });

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
   * Returns whether form is valid or not
   * 
   * @return whether form is valid or not
   */
  private isValid = () => {
    return !!(
      this.state.selectedItemGroupId
      && this.state.amount
      && this.state.weekdays.monday 
      || this.state.weekdays.tuesday
      || this.state.weekdays.wednesday
      || this.state.weekdays.thursday
      || this.state.weekdays.friday
      || this.state.weekdays.saturday
      || this.state.weekdays.sunday
    );
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to={{
        pathname: '/weekDeliveryPredictions',
        state: { category: this.state.category }
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
        {this.state.selectedItemGroupId && <p>{strings.formatString(strings.lastWeekDeliveries, this.state.lastWeeksDeliveryPredictionTotalAmount)}</p>}
        <Form>
          <Form.Field>
            <label>{strings.product}</label>
            {
              this.state.filteredItemGroups.length > 0 ?
                this.renderDropDown(itemGroupOptions, strings.product, "selectedItemGroupId")
                :
                <p>Ei voimassa olevaa sopimusta. Jos näin ei pitäisi olla, ole yhteydessä Pakkasmarjaan.</p>
            }
          </Form.Field>
          <Form.Field>
            <Header as="h4">{strings.nextWeekPrediction}</Header>
            <Input
              type="number"
              min={0}
              placeholder={strings.amount}
              value={this.state.amount}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleAmountChange(Number(event.currentTarget.value))
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
            <AsyncButton disabled={ !this.isValid() } onClick={ this.handleSubmit } color="red">
              {this.state.category === "FRESH" ? strings.newFreshWeekDeliveryPrediction : strings.newFrozenWeekDeliveryPrediction}
            </AsyncButton>
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
