import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Loader, Card, Form, Grid, Header, Button, List, Icon, Modal, Dropdown, DropdownProps } from "semantic-ui-react";
import strings from "src/localization/strings";
import ApplicationRoles from "src/utils/application-roles";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import * as moment from "moment";
import Api, { OpeningHourPeriod, DeliveryPlace, WeekdayType, OpeningHourWeekday, OpeningHourException, OpeningHourInterval } from "pakkasmarja-client";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance
}

/**
 * Interface for component state
 */
interface State {
  loading: boolean;
  redirectTo?: string;
  manageOpeningHoursRole: boolean;
  exceptionHoursDialogOpen: boolean;
  beginDate: Date;
  endDate: Date;
  deliveryPlaces: DeliveryPlace[];
  deliveryPlaceId?: string;
  openingHourPeriods: OpeningHourPeriod[];
  openingHourExceptions: OpeningHourException[];
  range: TimeRange;
}

interface TimeRange {
  beginDate: Date;
  endDate: Date;
}

class OpeningHoursScreen extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    const beginDate = new Date();
    beginDate.setMilliseconds(0);
    beginDate.setMinutes(0);
    const endDate = new Date();
    endDate.setMilliseconds(0);
    endDate.setMinutes(0);
    this.state = {
      loading: false,
      manageOpeningHoursRole: false,
      exceptionHoursDialogOpen: false,
      beginDate: moment().toDate(),
      endDate: moment().toDate(),
      deliveryPlaces: [],
      openingHourPeriods: [],
      openingHourExceptions: [],
      range: {
        beginDate: beginDate,
        endDate: endDate
      }
    };

    registerLocale('fi', fi);
  }

  /**
   * Component did mount life-cycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loading: true });
    const manageOpeningHoursRole = this.props.keycloak.hasRealmRole(ApplicationRoles.MANAGE_NEWS_ARTICLES);
    if (!manageOpeningHoursRole) {
      this.setState({ loading: false });
      return;
    }
    await this.fetchDeliveryPlaces();
    const tokenParsed = this.props.keycloak.tokenParsed as any;
    const receiveFromPlaceCode = tokenParsed.receiveFromPlaceCode;
    if (receiveFromPlaceCode) {
      await this.fetchOpeningHourData(receiveFromPlaceCode);
    }
    this.setState({ loading: false, manageOpeningHoursRole });
  }

  /**
   * Render
   */
  public render() {

    if (!this.props.keycloak) {
      return;
    }

    if (this.state.loading) {
      return (
        <BasicLayout pageTitle={ strings.openingHoursManagement }>
          <Loader inverted>
            { strings.loading }
          </Loader>
        </BasicLayout>
      );
    }

    const deliveryPlace = this.state.deliveryPlaces.find(place => place.id === this.state.deliveryPlaceId);
    const text = deliveryPlace ? deliveryPlace.name : strings.selectDeliveryPlace;

    return (
      <React.Fragment>
        { this.state.manageOpeningHoursRole &&
          <BasicLayout
            fluid={ true }
            redirectTo={ this.state.redirectTo }
            pageTitle={ strings.openingHoursManagement }
          >
            { this.props.keycloak.hasRealmRole(ApplicationRoles.ADMINISTRATE_OPENING_HOURS) &&
              <div style={{ display: "flex", justifyContent: "center", width: "100%", height: "100%" }}>
                <Dropdown text={ text } options={ this.mapOptions() } onChange={ this.handleSelection } />
              </div>
            }
            { this.state.deliveryPlaceId &&
              <>
                { this.renderEditTab() }
                { this.renderExceptionHoursDialog() }
              </>
            }
          </BasicLayout>
        }
      </React.Fragment>
    );
  }

  /**
   * Creates dropdown item options from delivery places
   */
  private mapOptions = () => {
    const { deliveryPlaces } = this.state;
    return deliveryPlaces.map(place => {
      return {
        text: place.name,
        value: place.id
      };
    });
  }

  /**
   * Fetches all delivery places
   */
  private fetchDeliveryPlaces = async () => {
    const { keycloak } = this.props;
    if (!keycloak) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const deliveryPlacesService = Api.getDeliveryPlacesService(token);
      const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
      this.setState({
        deliveryPlaces: deliveryPlaces
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Fetches opening hour data
   */
  private fetchOpeningHourData = async (deliveryPlaceId: string) => {
    const { keycloak } = this.props;
    if (!keycloak) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const openingHoursService = Api.getOpeningHoursService(token);
      const openingHourPeriods = await openingHoursService.listOpeningHourPeriods(deliveryPlaceId);
      const openingHourExceptions = await openingHoursService.listOpeningHourExceptions(deliveryPlaceId);
      this.setState({
        deliveryPlaceId: deliveryPlaceId,
        openingHourPeriods: openingHourPeriods,
        openingHourExceptions: openingHourExceptions
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Handles selecting delivery place for opening hours management
   * 
   * @param event event object
   * @param data dropdown props
   */
  private handleSelection = async (event: React.SyntheticEvent<HTMLElement>, data: DropdownProps) => {
    const { value } = data;
    if (value) {
      await this.fetchOpeningHourData(value.toString());
    }
  }

  /**
   * Renders exception hours dialog
   */
  private renderExceptionHoursDialog = () => {
    const { exceptionHoursDialogOpen, range } = this.state;
    return (
      <Modal open={ exceptionHoursDialogOpen } style={{ width: "20rem" }}>
        <Modal.Header>{ strings.newExceptionHours }</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field style={{ display: "flex", justifyContent: "center" }}>
              <label>Aikavälillä</label>
            </Form.Field>
            <Form.Group inline style={{ display: "flex", justifyContent: "center" }}>
              <Form.Field style={{ display: "flex", alignItems: "center" }}>
                <DatePicker
                  onChange={ this.setRange("beginDate") }
                  selected={ this.state.range.beginDate }
                  dateFormat="dd.MM.yyyy"
                  locale="fi"
                  minDate={ new Date() }
                  selectsStart
                  startDate={ range.beginDate }
                  endDate={ range.endDate }
                />
              </Form.Field>
              <Form.Field style={{ display: "flex", alignItems: "center" }}>
                <label>-</label>
                <DatePicker
                  onChange={ this.setRange("endDate") }
                  selected={ this.state.range.endDate }
                  dateFormat="dd.MM.yyyy"
                  locale="fi"
                  minDate={ new Date() }
                  selectsEnd
                  startDate={ range.beginDate }
                  endDate={ range.endDate }
                />
              </Form.Field>
            </Form.Group>
            <Form.Field style={{ display: "flex", justifyContent: "center" }}>
              <Button onClick={ this.cancelExceptionHoursDialog }>{ strings.cancel }</Button>
              <Button onClick={ this.addNewExceptionHoursBlock } color="red">{ strings.accept }</Button>
            </Form.Field>
          </Form>
        </Modal.Content>
      </Modal>
    );
  }

  /**
   * Sets range start or end date
   * 
   * @param key start or end date key
   * @param date date object
   */
  private setRange = (key: "beginDate" | "endDate" ) => (date: Date) => {
    const { range } = this.state;
    let updatedRange = range;
    if (key === "beginDate" && date.getTime() > range.endDate.getTime()) {
      updatedRange.endDate = date;
    }
    if (key === "endDate" && date.getTime() < range.beginDate.getTime()) {
      updatedRange.beginDate = date;
    }
    updatedRange = {...updatedRange, [key]: date};

    this.setState({
      range: updatedRange
    });
  }

  /**
   * Renders edit tab
   */
  private renderEditTab = () => {

    return (
      <>
        <Grid padded style={{ display: "flex", justifyContent: "space-between" }}>
          <Header size="large" style={{ marginTop: 20, marginLeft: 20 }}>{ strings.defaultPeriods }</Header>
          <Button style={{ borderRadius: 0 }} color="red" onClick={ this.addNewOpeningHoursBlock }>
            { strings.newOpeningHoursPeriod }
          </Button>
        </Grid>
        { this.renderOpeningHoursBlocks() }
        <Grid style={{ height: "5rem" }}></Grid>
        <Grid padded style={{ display: "flex", justifyContent: "space-between" }}>
          <Header size="large" style={{ marginTop: 20, marginLeft: 20 }}>{ strings.exceptionPeriods }</Header>
          <Button style={{ borderRadius: 0 }} color="red" onClick={ this.openExceptionHoursDialog }>
            { strings.newExceptionHours }
          </Button>
        </Grid>
        <List padded style={{ marginLeft: 30, paddingLeft: "1rem" }}>
          { this.renderExceptionHoursBlock() }
        </List>
      </>
    );
  }

  /**
   * Opens exception hours dialog
   */
  private openExceptionHoursDialog = () => {
    this.setState({
      exceptionHoursDialogOpen: true
    });
  }

  /**
   * Cancels exception hours dialog
   */
  private cancelExceptionHoursDialog = () => {
    this.setState({
      exceptionHoursDialogOpen: false
    });
  }

  /**
   * Adds new opening hours block
   */
  private addNewOpeningHoursBlock = async () => {
    const { openingHourPeriods, deliveryPlaceId } = this.state;
    const { keycloak } = this.props;
    if (!keycloak || !deliveryPlaceId) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    const today = new Date();
    const lastMonday = new Date((today.getDay() < 1 ? -6 : 1 - today.getDay()) * 86400000 + today.getTime());
    const nextSunday = new Date((today.getDay() < 1 ? 7 : 7 - today.getDay()) * 86400000 + today.getTime());
    const openingHourPeriodBody: OpeningHourPeriod = {
      beginDate: lastMonday,
      endDate: nextSunday,
      weekdays: [
        {
          dayType: WeekdayType.MONDAY,
          hours: []
        },
        {
          dayType: WeekdayType.TUESDAY,
          hours: []
        },
        {
          dayType: WeekdayType.WEDNESDAY,
          hours: []
        },
        {
          dayType: WeekdayType.THURSDAY,
          hours: []
        },
        {
          dayType: WeekdayType.FRIDAY,
          hours: []
        },
        {
          dayType: WeekdayType.SATURDAY,
          hours: []
        },
        {
          dayType: WeekdayType.SUNDAY,
          hours: []
        }
      ]
    }
    const openingHoursService = Api.getOpeningHoursService(token);
    const openingHourPeriod = await openingHoursService.createOpeningHourPeriod(openingHourPeriodBody, deliveryPlaceId);
    this.setState({
      openingHourPeriods: [openingHourPeriod, ...openingHourPeriods]
    });
  }

  /**
   * Maps dates between start and end date
   */
  private mapDates = (beginDate: Date, endDate: Date) => {
    if (beginDate.getTime() > endDate.getTime()) {
      return [];
    }

    const dates = [beginDate];
    while (dates.findIndex(date => `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}` === `${endDate.getDate()}.${endDate.getMonth() + 1}.${endDate.getFullYear()}`) === -1) {
      const nextDate = new Date(dates[dates.length - 1].getTime() + 86400000);
      dates.push(nextDate);
    }
    const datesAsString = dates.map(date => `${ date.getFullYear() }-${ date.getMonth() + 1 < 10 ? `0${ date.getMonth() + 1 }` : date.getMonth() + 1 }-${ date.getDate() < 10 ? `0${ date.getDate() }` : date.getDate() }`);
    return datesAsString;
  }

  /**
   * Adds new exception hours block
   */
  private addNewExceptionHoursBlock = async () => {
    const { openingHourExceptions, deliveryPlaceId, range } = this.state;
    const { keycloak } = this.props;

    if (!keycloak || !deliveryPlaceId) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }

    const openingHoursService = Api.getOpeningHoursService(token);
    const dates = this.mapDates(range.beginDate, range.endDate).filter(date => openingHourExceptions.findIndex(exception => exception.exceptionDate === date) === -1);
    const createOpeningHourExceptionPromises = dates.map(date => {
      const openingHourExceptionBody: OpeningHourException = {
        exceptionDate: date,
        hours: []
      };
      return openingHoursService.createOpeningHourException(openingHourExceptionBody, deliveryPlaceId);
    });
    const newOpeningHourExceptions = await Promise.all(createOpeningHourExceptionPromises);
    const updatedOpeningHourExceptions = [...openingHourExceptions, ...newOpeningHourExceptions];
    updatedOpeningHourExceptions.sort((a, b) => {
      const date1 = new Date(a.exceptionDate);
      const date2 = new Date(b.exceptionDate);
      return date1.getTime() - date2.getTime();
    });
    this.setState({
      openingHourExceptions: updatedOpeningHourExceptions,
      exceptionHoursDialogOpen: false
    });
  }

  /**
   * Renders opening hours blocks
   */
  private renderOpeningHoursBlocks = () => {
    return this.state.openingHourPeriods.map(openingHourPeriod => { return this.renderOpeningHoursBlock(openingHourPeriod) });
  }

  /**
   * Renders single opening hours block
   */
  private renderOpeningHoursBlock = (openingHourPeriod: OpeningHourPeriod) => {
    const weekdayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    const weekdaysSorted = openingHourPeriod.weekdays.sort((a, b) => {
      return weekdayOrder.findIndex(day => day === a.dayType) - weekdayOrder.findIndex(day => day === b.dayType);
    });
    const openingHourWeekdaysRendered = weekdaysSorted.map((openingHourWeekday: OpeningHourWeekday, index: number) => {
      return (
        <div key={ index } style={{ display: "inline-block" }}>
          { this.renderWeekday(openingHourWeekday, openingHourPeriod) }
        </div>
      )
    });

    return (
      <Card
        centered
        fluid
        raised
        style={{ padding: 10, paddingTop: 20 }}
      >
        <Card.Description>
          <Form>
            <Form.Group inline style={{ display: "flex", justifyContent: "center" }}>
              {
                this.renderTimeRange(openingHourPeriod)
              }
            </Form.Group>
          </Form>
        </Card.Description>
        <Card.Content>
          <Grid
            columns={ 7 }
            centered
          >
            <Grid.Row style={{ justifyContent: "center" }}>
              { openingHourWeekdaysRendered }
            </Grid.Row>
          </Grid>
        </Card.Content>
      </Card>
    );
  }

  /**
   * Renders time range
   */
  private renderTimeRange = (openingHourPeriod: OpeningHourPeriod) => {
    const today = new Date();
    const lastMonday = new Date((today.getDay() < 1 ? -6 : 1 - today.getDay()) * 86400000 + today.getTime());
    const nextSunday = new Date((today.getDay() < 1 ? 7 : 7 - today.getDay()) * 86400000 + today.getTime());
    return (
      <>
        <Form.Field style={{ display: "flex", alignItems: "center" }}>
          <label>Aikavälillä</label>
          <DatePicker
            onChange={ this.setTimeRange(openingHourPeriod, openingHourPeriod.id) }
            selected={ openingHourPeriod.beginDate }
            dateFormat="dd.MM.yyyy"
            locale="fi"
            minDate={ lastMonday }
            filterDate={ (date) => {
              return date.getDay() === 1;
            } }
            startDate={ openingHourPeriod.beginDate }
            endDate={ openingHourPeriod.endDate }
          />
        </Form.Field>
        <Form.Field style={{ display: "flex", alignItems: "center" }}>
          <label>-</label>
          <DatePicker
            onChange={ this.setTimeRange(openingHourPeriod, openingHourPeriod.id) }
            selected={ openingHourPeriod.endDate }
            dateFormat="dd.MM.yyyy"
            locale="fi"
            minDate={ nextSunday }
            filterDate={ (date) => {
              return date.getDay() === 0;
            } }
            startDate={ openingHourPeriod.beginDate }
            endDate={ openingHourPeriod.endDate }
          />
        </Form.Field>
        <Form.Field onClick={ this.deleteOpeningHoursBlock(openingHourPeriod, openingHourPeriod.id) } style={{ cursor: "pointer" }}>
          <Icon name="trash" />
        </Form.Field>
      </>
    );
  }

  /**
   * Sets opening hours block time range
   */
  private setTimeRange = (openingHourPeriod: OpeningHourPeriod, openingHourPeriodId?: string) => async (date: Date) => {
    const { openingHourPeriods, deliveryPlaceId } = this.state;
    const { keycloak } = this.props;
    if (!keycloak || !deliveryPlaceId || !openingHourPeriodId) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const key = date.getDay() === 1 ? "beginDate" : "endDate";
      const openingHourPeriodBody = {
        ...openingHourPeriod
      }

      if (key === "beginDate" && date.getTime() > new Date(openingHourPeriod.endDate).getTime()) {
        const nextSunday = new Date((date.getDay() < 1 ? 7 : 7 - date.getDay()) * 86400000 + date.getTime());
        openingHourPeriodBody[key] = date;
        openingHourPeriodBody["endDate"] = nextSunday;
      } else if (key === "endDate" && date.getTime() < new Date(openingHourPeriod.beginDate).getTime()) {
        const lastMonday = new Date((date.getDay() < 1 ? -6 : 1 - date.getDay()) * 86400000 + date.getTime());
        openingHourPeriodBody[key] = date;
        openingHourPeriodBody["beginDate"] = lastMonday;
      } else {
        openingHourPeriodBody[key] = date;
      }

      const openingHoursService = Api.getOpeningHoursService(token);
      const updatedOpeningHourPeriod = await openingHoursService.updateOpeningHourPeriod(openingHourPeriodBody, deliveryPlaceId, openingHourPeriodId);
      const updatedOpeningHourPeriods = openingHourPeriods.map(period => {
        if (period.id === updatedOpeningHourPeriod.id) {
          return openingHourPeriodBody;
        }
        return period;
      });
      this.setState({
        openingHourPeriods: updatedOpeningHourPeriods
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Deletes opening hours block
   */
  private deleteOpeningHoursBlock = (openingHourPeriod: OpeningHourPeriod, openingHourExceptionId?: string) => async (event: any) => {
    const { openingHourPeriods, deliveryPlaceId } = this.state;
    const { keycloak } = this.props;
    if (!keycloak || !deliveryPlaceId || !openingHourExceptionId) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const openingHoursService = Api.getOpeningHoursService(token);
      await openingHoursService.deleteOpeningHourPeriod(deliveryPlaceId, openingHourExceptionId);
      this.setState({
        openingHourPeriods: openingHourPeriods.filter(item => item.id !== openingHourPeriod.id)
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Deletes exception hours block
   */
  private deleteExceptionHoursBlock = (openingHourExceptionId?: string) => async (event: any) => {
    const { openingHourExceptions, deliveryPlaceId } = this.state;
    const { keycloak } = this.props;
    if (!keycloak || !deliveryPlaceId || !openingHourExceptionId) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const openingHoursService = Api.getOpeningHoursService(token);
      await openingHoursService.deleteOpeningHourException(deliveryPlaceId, openingHourExceptionId);
      this.setState({
        openingHourExceptions: openingHourExceptions.filter(exception => exception.id !== openingHourExceptionId)
      });
    } catch (error) {
      alert(error);
    }
  }

  /**
   * Renders exception hours block
   */
  private renderExceptionHoursBlock = () => {
    const { openingHourExceptions } = this.state;
    return openingHourExceptions.map((openingHourException: OpeningHourException, index: number) => {
      return (
        <List.Item key={ index } style={{ marginBottom: "2rem" }}>
          <List.Content>
            <Form>
                <Form.Field style={{ display: "flex", marginBottom: "2rem", marginRight: "1.5rem" }}>
                  <Header style={{ marginRight: "1rem" }}>{ this.formatDate(openingHourException.exceptionDate) }</Header>
                  <Button style={{ fontSize: "0.8rem" }} color="red" onClick={ this.deleteExceptionHoursBlock(openingHourException.id) }>{ strings.deleteBlock }</Button>
                </Form.Field>
                <Form.Field>
                  <span style={{ cursor: "pointer" }} onClick={ this.deleteExceptionHours(openingHourException, openingHourException.id) }>{ strings.deleteHours }<Icon style={{ marginRight: "1rem", marginLeft: "1rem" }} name="trash" /></span>
                  <span style={{ cursor: "pointer" }} onClick={ this.addExceptionHours(openingHourException, openingHourException.id) }>{ strings.addNewHours }<Icon style={{ marginRight: "1rem", marginLeft: "1rem" }} name="add circle" /></span>
                </Form.Field>
                {
                  openingHourException.hours.map((hour: OpeningHourInterval, index: number) => {
                    return (
                      <Form.Group style={{ width: "15rem", marginRight: "1.5rem", display: "inline-block" }}>
                        { this.renderHoursRow(openingHourException, index, hour, true) }
                      </Form.Group>
                    );
                  })
                }
            </Form>
          </List.Content>
        </List.Item>
      );
    });
  }

  /**
   * Format date string from yyyy-mm-dd to dd.mm.yyyy
   *
   * @param dateString date string
   */
  private formatDate = (dateString: string) => {
    const dateObject = new Date(Date.parse(dateString));
    const date = dateObject.getDate() < 10 ? `0${dateObject.getDate()}` : dateObject.getDate();
    const month = dateObject.getMonth() < 10 ? `0${dateObject.getMonth() + 1}` : dateObject.getMonth() + 1;
    const year = dateObject.getFullYear();
    const formattedDateString = `${ date }.${ month }.${ year }`;
    return formattedDateString;
  }

  /**
   * Adds exception hours to the row
   *
   * @param openingHourException opening hour exception
   */
  private addExceptionHours = (openingHourException: OpeningHourException, openingHourExceptionId?: string) => async (event: any) => {
    const { keycloak } = this.props;
    const { openingHourExceptions, deliveryPlaceId } = this.state;
    if (!keycloak || !deliveryPlaceId || !openingHourExceptionId) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const openingHoursService = Api.getOpeningHoursService(token);
      const opens = new Date();
      opens.setMilliseconds(0);
      opens.setMinutes(0);
      const closes = new Date();
      closes.setMilliseconds(0);
      closes.setMinutes(0);
      const openingHourExceptionBody = {
        ...openingHourException,
        hours: [
          ...openingHourException.hours,
          {
            opens: opens,
            closes: closes
          }
        ]
      };
      const updatedOpeningHourException = await openingHoursService.updateOpeningHourException(openingHourExceptionBody, deliveryPlaceId, openingHourExceptionId);
      const updatedOpeningHourExceptions = openingHourExceptions.map(exception => {
        if (exception.id === updatedOpeningHourException.id) {
          return updatedOpeningHourException;
        }
        return exception;
      });
      this.setState({
        openingHourExceptions: updatedOpeningHourExceptions
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Deletes exception hour from the row
   * 
   * @param weekDay week day
   */
  private deleteExceptionHours = (openingHourException: OpeningHourException, openingHourExceptionId?: string) => async (event: any) => {
    const { keycloak } = this.props;
    const { openingHourExceptions, deliveryPlaceId } = this.state;
    if (!keycloak || !deliveryPlaceId || !openingHourExceptionId) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const openingHoursService = Api.getOpeningHoursService(token);
      const updatedHours = openingHourException.hours;
      updatedHours.pop();
      const openingHourExceptionBody = {
        ...openingHourException,
        hours: updatedHours
      };
      const updatedOpeningHourException = await openingHoursService.updateOpeningHourException(openingHourExceptionBody, deliveryPlaceId, openingHourExceptionId);
      const updatedOpeningHourExceptions = openingHourExceptions.map(exception => {
        if (exception.id === updatedOpeningHourException.id) {
          return updatedOpeningHourException;
        }
        return exception;
      });
      this.setState({
        openingHourExceptions: updatedOpeningHourExceptions
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Adds opening hours to the item
   */
  private addOpeningHours = (openingHourWeekday: OpeningHourWeekday, openingHourPeriod: OpeningHourPeriod) => async (event: any) => {
    const { keycloak } = this.props;
    const { openingHourPeriods, deliveryPlaceId } = this.state;
    if (!keycloak || !deliveryPlaceId || !openingHourPeriod.id) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const { weekdays } = openingHourPeriod;
      const opens = new Date();
      opens.setMilliseconds(0);
      opens.setMinutes(0);
      const closes = new Date();
      closes.setMilliseconds(0);
      closes.setMinutes(0);
      const updatedWeekdays = weekdays.map(day => {
        if (day.id === openingHourWeekday.id) {
          day.hours = [
            ...day.hours,
            {
              opens: opens,
              closes: closes
            }
          ];
        }
        return day;
      });
      const openingHourPeriodBody = {
        ...openingHourPeriod,
        weekdays: updatedWeekdays
      };
      const openingHoursService = Api.getOpeningHoursService(token);
      const updatedOpeningHourPeriod = await openingHoursService.updateOpeningHourPeriod(openingHourPeriodBody, deliveryPlaceId, openingHourPeriod.id);
      const updatedOpeningHourPeriods = openingHourPeriods.map(period => {
        if (period.id === updatedOpeningHourPeriod.id) {
          return updatedOpeningHourPeriod;
        }
        return period;
      });
      this.setState({
        openingHourPeriods: updatedOpeningHourPeriods
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Deletes opening hour from the row 
   */
  private deleteOpeningHours = (openingHourWeekday: OpeningHourWeekday, openingHourPeriod: OpeningHourPeriod) => async (event: any) => {
    const { keycloak } = this.props;
    const { openingHourPeriods, deliveryPlaceId } = this.state;
    if (!keycloak || !deliveryPlaceId || !openingHourPeriod.id) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const { weekdays } = openingHourPeriod;
      const updatedWeekdays = weekdays.map(day => {
        if (day.id === openingHourWeekday.id) {
          day.hours.pop();
        }
        return day;
      });
      const openingHourPeriodBody = {
        ...openingHourPeriod,
        weekdays: updatedWeekdays
      };
      const openingHoursService = Api.getOpeningHoursService(token);
      const updatedOpeningHourPeriod = await openingHoursService.updateOpeningHourPeriod(openingHourPeriodBody, deliveryPlaceId, openingHourPeriod.id);
      const updatedOpeningHourPeriods = openingHourPeriods.map(period => {
        if (period.id === updatedOpeningHourPeriod.id) {
          return updatedOpeningHourPeriod;
        }
        return period;
      });
      this.setState({
        openingHourPeriods: updatedOpeningHourPeriods
      });
    } catch (error) {
      console.log(error);
    }
  }
  
  /**
   * Renders single week day
   * 
   * @param day day
   */
  private renderWeekday = (openingHourWeekday: OpeningHourWeekday, openingHourPeriod: OpeningHourPeriod) => {
    return (
      <Card style={{ width: "18rem", marginLeft: "0.4rem", marginRight: "0.4rem" }}>
        <Card.Header
          textAlign="center"
          style={{ backgroundColor: "#E51D2A", color: "#fff", fontSize: 16, padding: 5 }}
        >
          { openingHourWeekday.dayType }
        </Card.Header>
        <Card.Content>
          <Form>
            {
              openingHourWeekday.hours.map((hours, index) => this.renderHoursRow(openingHourPeriod, index, hours, false, openingHourWeekday))
            }
            <Form.Field>
              <span style={{ cursor: "pointer" }} onClick={ this.deleteOpeningHours(openingHourWeekday, openingHourPeriod) }>{ strings.deleteHours }<Icon style={{ marginRight: "1rem", marginLeft: "1rem" }} name="trash" /></span>
              <span style={{ cursor: "pointer" }} onClick={ this.addOpeningHours(openingHourWeekday, openingHourPeriod) }>{ strings.addNewHours }<Icon style={{ marginRight: "1rem", marginLeft: "1rem" }} name="add circle" /></span>
            </Form.Field>
          </Form>
        </Card.Content>
      </Card>
    );
  }

  /**
   * Renders single hours row
   * 
   * @param day week day
   */
  private renderHoursRow = (openingHour: OpeningHourPeriod | OpeningHourException, index: number, hours: OpeningHourInterval, isException?: boolean, openingHourday?: OpeningHourWeekday) => {
    let hoursHandler;
    if (isException && 'exceptionDate' in openingHour && 'exceptionDate') {
      hoursHandler = (openOrClose: "opens"|"closes") => (date: Date) => this.onChangeExceptionHours(openingHour, index, openOrClose, date);
    } else if ('beginDate' in openingHour && openingHourday) {
      hoursHandler = (openOrClose: "opens"|"closes") => (date: Date) => this.onChangeOpeningHours(openingHour, openingHourday, index, openOrClose, date);
    } else {
      hoursHandler = (openOrClose: "opens"|"closes") => (date: Date) => null;
    }
    return (
      <Form.Group inline style={{ width: "15rem" }}>
        <Form.Field>
          <DatePicker
            selected={ hours.opens }
            onChange={ hoursHandler("opens") }
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={ 15 }
            timeCaption="Klo"
            locale="fi"
            dateFormat="HH.mm"
            timeFormat="HH.mm"
          />
        </Form.Field>
        <Form.Field style={{ display: "flex", alignItems: "center" }}>
          <label>-</label>
          <DatePicker
            selected={ hours.closes }
            onChange={ hoursHandler("closes") }
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={ 15 }
            timeCaption="Klo"
            locale="fi"
            dateFormat="HH.mm"
            timeFormat="HH.mm"
          />
        </Form.Field>
      </Form.Group>
    );
  }

  /**
   * Event handler for change weekday data
   * 
   */
  private onChangeOpeningHours = async (openingHour: OpeningHourPeriod, openingHourWeekday: OpeningHourWeekday, hoursIndex: number, key: string, value: Date | null) => {
    const { openingHourPeriods, deliveryPlaceId } = this.state;
    const { keycloak } = this.props;
    if (!keycloak || !deliveryPlaceId || !openingHour.id) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    try {
      const openingHoursService = Api.getOpeningHoursService(token);
      const weekdaysWithHoursUpdated = openingHour.weekdays.map((day) => {
        if (day.id === openingHourWeekday.id) {
          return {
            ...day,
            hours: day.hours.map((hour, index) => {
              if (index === hoursIndex) {
                return {
                  ...hour,
                  [key]: value
                };
              }
              return hour;
            })
          }
        }
        return day;
      });
      const openingHourPeriodBody = {
        id: openingHour.id,
        beginDate: openingHour.beginDate,
        endDate: openingHour.endDate,
        weekdays: weekdaysWithHoursUpdated
      };
      const updatedOpeningHourPeriod = await openingHoursService.updateOpeningHourPeriod(openingHourPeriodBody, deliveryPlaceId, openingHour.id);
      this.setState({
        openingHourPeriods: openingHourPeriods.map(item => {
          if (item.id === updatedOpeningHourPeriod.id) {
            return updatedOpeningHourPeriod;
          }
          return item;
        })
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Event handler for change exceptionday data
   */
  private onChangeExceptionHours = async (openingHour: OpeningHourException, hoursIndex: number, key: string, value: Date | null) => {
    const { openingHourExceptions, deliveryPlaceId } = this.state;
    const { keycloak } = this.props;
    if (!keycloak || !deliveryPlaceId || !openingHour.id) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    const openingHoursService = Api.getOpeningHoursService(token);
    const updatedHours = openingHour.hours.map((hour, index) => {
      if (index === hoursIndex) {
        return {
          ...hour,
          [key]: value
        };
      }
      return hour;
    });
    const openingHourExceptionBody = {
      id: openingHour.id,
      exceptionDate: openingHour.exceptionDate,
      hours: updatedHours
    };
    const updatedOpeningHourPeriod = await openingHoursService.updateOpeningHourException(openingHourExceptionBody, deliveryPlaceId, openingHour.id);
    this.setState({
      openingHourExceptions: openingHourExceptions.map(item => {
        if (item.id === updatedOpeningHourPeriod.id) {
          return updatedOpeningHourPeriod;
        }
        return item;
      })
    });
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

export default connect(mapStateToProps, mapDispatchToProps)(OpeningHoursScreen);