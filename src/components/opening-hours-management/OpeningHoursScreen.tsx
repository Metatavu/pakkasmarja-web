import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Loader, Tab, Card, Form, Grid, Checkbox, Header, Button, List, Icon, Modal } from "semantic-ui-react";
import strings from "src/localization/strings";
import ApplicationRoles from "src/utils/application-roles";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import * as moment from "moment";

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
  startDate: Date;
  endDate: Date;
  weeks: Week[];
  exceptionDays: Weekday[];
  range: TimeRange
}

interface TimeRange {
  startDate: Date;
  endDate: Date;
}

interface Week {
  id: string;
  startDate: Date;
  endDate: Date;
  weekDays: Weekday[]
}

/**
 * Interface describing weekday
 */
interface Weekday {
  id: string;
  date: Date;
  name: string;
  hours: OpeningHours[];
}

interface OpeningHours {
  opens: Date;
  closes: Date;
}

class OpeningHoursScreen extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    const hours = { opens: moment().toDate(), closes: moment().toDate() };
    const today = new Date();
    const lastMonday = new Date((today.getDay() < 1 ? -6 : 1 - today.getDay()) * 86400000 + today.getTime());
    const nextSunday = new Date((today.getDay() < 1 ? 7 : 7 - today.getDay()) * 86400000 + today.getTime());
    this.state = {
      loading: false,
      manageOpeningHoursRole: false,
      exceptionHoursDialogOpen: false,
      startDate: moment().toDate(),
      endDate: moment().toDate(),
      weeks: [
        {
          id: "1",
          startDate: lastMonday,
          endDate: nextSunday,
          weekDays: [
            { id: "4" , date: new Date() ,name: "maanantai", hours: [{ ...hours }] },
            { id: "5" , date: new Date() ,name: "tiistai", hours: [{ ...hours }, { ...hours }, { ...hours }, { ...hours }] },
            { id: "6" , date: new Date() ,name: "keskiviikko", hours: [{ ...hours }] },
            { id: "7" , date: new Date() ,name: "torstai", hours: [{ ...hours }] },
            { id: "8" , date: new Date() ,name: "perjantai", hours: [{ ...hours }] },
            { id: "9" , date: new Date() ,name: "lauantai", hours: [{ ...hours }] },
            { id: "10" , date: new Date() ,name: "sunnuntai", hours: [{ ...hours }] }
          ]
        },
        {
          id: "2",
          startDate: lastMonday,
          endDate: nextSunday,
          weekDays: [
            { id: "11" , date: new Date() ,name: "maanantai", hours: [{ ...hours }] },
            { id: "12" , date: new Date() ,name: "tiistai", hours: [{ ...hours }] },
            { id: "13" , date: new Date() ,name: "keskiviikko", hours: [{ ...hours }, { ...hours }, { ...hours }] },
            { id: "14" , date: new Date() ,name: "torstai", hours: [{ ...hours }] },
            { id: "15" , date: new Date() ,name: "perjantai", hours: [{ ...hours }] },
            { id: "16" , date: new Date() ,name: "lauantai", hours: [{ ...hours }] },
            { id: "17" , date: new Date() ,name: "sunnuntai", hours: [{ ...hours }, { ...hours }] }
          ]
        },
        {
          id: "3",
          startDate: lastMonday,
          endDate: nextSunday,
          weekDays: [
            { id: "18" , date: new Date() ,name: "maanantai", hours: [{ ...hours }] },
            { id: "19" , date: new Date() ,name: "tiistai", hours: [{ ...hours }] },
            { id: "20" , date: new Date() ,name: "keskiviikko", hours: [{ ...hours }] },
            { id: "21" , date: new Date() ,name: "torstai", hours: [{ ...hours }] },
            { id: "22" , date: new Date() ,name: "perjantai", hours: [{ ...hours }] },
            { id: "23" , date: new Date() ,name: "lauantai", hours: [{ ...hours }] },
            { id: "24" , date: new Date() ,name: "sunnuntai", hours: [{ ...hours }] }
          ]
        },
      ],
      exceptionDays: [
        { id: "25", date: new Date(), name: "18.5.2020", hours: [{ ...hours }, { ...hours }, { ...hours }, { ...hours }, { ...hours }, { ...hours }] },
      ],
      range: {
        startDate: new Date(),
        endDate: new Date()
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
    // Some api calls in here
    this.setState({ loading: false, manageOpeningHoursRole });
  }

  /**
   * Render
   */
  public render() {

    if (this.state.loading) {
      return (
        <BasicLayout pageTitle={ strings.openingHoursManagement }>
          <Loader inverted>
            { strings.loading }
          </Loader>
        </BasicLayout>
      );
    }

    const panes = [
      {
        menuItem: strings.editOpeningHours,
        render: () => <Tab.Pane as="div" attached={ false }>
          { this.renderEditTab() }
        </Tab.Pane>
      },
      {
        menuItem: strings.previewOpeningHours,
        render: () => <Tab.Pane as="div" attached={ false }>
          { this.renderPreviewTab() }
        </Tab.Pane>
      }
    ];

    return (
      <React.Fragment>
        { this.state.manageOpeningHoursRole &&
          <BasicLayout
            fluid={ true }
            redirectTo={ this.state.redirectTo }
            pageTitle={ strings.openingHoursManagement }
          >
            <Tab
              menu={{ secondary: true, pointing: true }}
              panes={ panes }
            />
            { this.renderExceptionHoursDialog() }
          </BasicLayout>
        }
      </React.Fragment>
    );
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
                  onChange={ this.setRange("startDate") }
                  selected={ this.state.range.startDate }
                  dateFormat="dd.MM.yyyy"
                  locale="fi"
                  minDate={ new Date() }
                  selectsStart
                  startDate={ range.startDate }
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
                  startDate={ range.startDate }
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
  private setRange = (key: "startDate" | "endDate" ) => (date: Date) => {
    const { range } = this.state;
    const updatedRange = range;
    if (key === "startDate" && date.getTime() > range.endDate.getTime()) {
      updatedRange.endDate = date;
    }
    if (key === "endDate" && date.getTime() < range.startDate.getTime()) {
      updatedRange.startDate = date;
    }
    this.setState({
      range: {...updatedRange, [key]: date}
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
  private addNewOpeningHoursBlock = () => {
    const { weeks } = this.state;
    const today = new Date();
    const lastMonday = new Date((today.getDay() < 1 ? -6 : 1 - today.getDay()) * 86400000 + today.getTime());
    const nextSunday = new Date((today.getDay() < 1 ? 7 : 7 - today.getDay()) * 86400000 + today.getTime());
    const updatedWeeks = [
      {
        id: Math.random().toString(),
        startDate: lastMonday,
        endDate: nextSunday,
        weekDays: [
          {
            id: Math.random().toString(),
            date: new Date(),
            name: "maanantai", hours: [
              {
                opens: new Date(),
                closes: new Date()
              }
            ]
          },
          {
            id: Math.random().toString(),
            date: new Date(),
            name: "tiistai", hours: [
              {
                opens: new Date(),
                closes: new Date()
              }
            ]
          },
          {
            id: Math.random().toString(),
            date: new Date(),
            name: "keskiviikko", hours: [
              {
                opens: new Date(),
                closes: new Date()
              }
            ]
          },
          {
            id: Math.random().toString(),
            date: new Date(),
            name: "torstai", hours: [
              {
                opens: new Date(),
                closes: new Date()
              }
            ]
          },
          {
            id: Math.random().toString(),
            date: new Date(),
            name: "perjantai", hours: [
              {
                opens: new Date(),
                closes: new Date()
              }
            ]
          },
          {
            id: Math.random().toString(),
            date: new Date(),
            name: "lauantai", hours: [
              {
                opens: new Date(),
                closes: new Date()
              }
            ]
          },
          {
            id: Math.random().toString(),
            date: new Date(),
            name: "sunnuntai", hours: [
              {
                opens: new Date(),
                closes: new Date()
              }
            ]
          },
        ]
      },
      ...weeks
    ];
    this.setState({
      weeks: updatedWeeks
    });
  }

  /**
   * Maps dates between start and end date
   */
  private mapDates = (startDate: Date, endDate: Date) => {
    if (startDate.getTime() > endDate.getTime()) {
      return [];
    }

    const dates = [startDate];
    while (dates.findIndex(date => `${date.getDate()}.${date.getMonth()}.${date.getFullYear()}` === `${endDate.getDate()}.${endDate.getMonth()}.${endDate.getFullYear()}`) === -1) {
      const nextDate = new Date(dates[dates.length - 1].getTime() + 86400000);
      dates.push(nextDate);
    }
    return dates;
  }

  /**
   * Adds new exception hours block
   */
  private addNewExceptionHoursBlock = () => {
    const { exceptionDays, range } = this.state;

    const dates = this.mapDates(range.startDate, range.endDate);
    const updatedExceptionDays = [...dates.map(date => {
      return {
        id: Math.random().toString(),
        name: `${date.getDate()}.${date.getMonth()}.${date.getFullYear()}`,
        date: date,
        hours: [
          {
            opens: new Date(),
            closes: new Date()
          }
        ]
      }
    })
    .filter(date => 
      exceptionDays.find(exception => exception.name === date.name) === undefined
    ), ...exceptionDays];
    updatedExceptionDays.sort((a, b) => {
      return a.date.getTime() - b.date.getTime();
    });
    this.setState({
      exceptionDays: updatedExceptionDays,
      exceptionHoursDialogOpen: false
    });
  }

  /**
   * Renders preview tab
   */
  private renderPreviewTab = () => {
    return null;
  }

  /**
   * Renders opening hours blocks
   */
  private renderOpeningHoursBlocks = () => {
    const { weeks } = this.state;
    return weeks.map(week => { return this.renderOpeningHoursBlock(week) });
  }

  /**
   * Renders single opening hours block
   */
  private renderOpeningHoursBlock = (week: Week) => {

    const weekDays = week.weekDays;

    const weekDaysRendered = weekDays.map((day: Weekday, index: number) => {
      return (
        <div key={ index } style={{ display: "inline-block" }}>
          { this.renderWeekday(day) }
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
                this.renderTimeRange(week)
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
              { weekDaysRendered }
            </Grid.Row>
          </Grid>
        </Card.Content>
      </Card>
    );
  }

  /**
   * Renders time range
   */
  private renderTimeRange = (week: Week) => {
    const today = new Date();
    const lastMonday = new Date((today.getDay() < 1 ? -6 : 1 - today.getDay()) * 86400000 + today.getTime());
    const nextSunday = new Date((today.getDay() < 1 ? 7 : 7 - today.getDay()) * 86400000 + today.getTime());

    return (
      <>
        <Form.Field style={{ display: "flex", alignItems: "center" }}>
          <label>Aikavälillä</label>
          <DatePicker
            onChange={ this.setTimeRange(week) }
            selected={ week.startDate }
            dateFormat="dd.MM.yyyy"
            locale="fi"
            minDate={ lastMonday }
            filterDate={ (date) => {
              return date.getDay() === 1;
            } }
            startDate={ week.startDate }
            endDate={ week.endDate }
          />
        </Form.Field>
        <Form.Field style={{ display: "flex", alignItems: "center" }}>
          <label>-</label>
          <DatePicker
            onChange={ this.setTimeRange(week) }
            selected={ week.endDate }
            dateFormat="dd.MM.yyyy"
            locale="fi"
            minDate={ nextSunday }
            filterDate={ (date) => {
              return date.getDay() === 0;
            } }
            startDate={ week.startDate }
            endDate={ week.endDate }
          />
        </Form.Field>
        <Form.Field onClick={ this.deleteOpeningHoursBlock(week) } style={{ cursor: "pointer" }}>
          <Icon name="trash" />
        </Form.Field>
      </>
    );
  }

  /**
   * Sets opening hours block time range
   */
  private setTimeRange = (week: Week) => (date: Date) => {
    const { weeks } = this.state;
    const key = date.getDay() === 1 ? "startDate" : "endDate";
    const changedWeeks = weeks.map(item => {
      if (item.id === week.id) {
        if (key === "startDate" && date.getTime() > week.endDate.getTime()) {
          const nextSunday = new Date((date.getDay() < 1 ? 7 : 7 - date.getDay()) * 86400000 + date.getTime());
          return {
            ...item,
            [key]: date,
            endDate: nextSunday
          };
        }
        if (key === "endDate" && date.getTime() < week.startDate.getTime()) {
          const lastMonday = new Date((date.getDay() < 1 ? -6 : 1 - date.getDay()) * 86400000 + date.getTime());
          return {
            ...item,
            [key]: date,
            startDate: lastMonday
          };
        }
        return {
          ...item,
          [key]: date
        };
      }
      return item;
    });
    this.setState({
      weeks: changedWeeks
    });
  }

  /**
   * Deletes opening hours block
   */
  private deleteOpeningHoursBlock = (week: Week) => (event: any) => {
    const { weeks } = this.state;
    this.setState({
      weeks: weeks.filter(item => item.id !== week.id)
    });
  }

  /**
   * Deletes exception hours block
   */
  private deleteExceptionHoursBlock = (day: Weekday) => (event: any) => {
    const { exceptionDays } = this.state;
    this.setState({
      exceptionDays: exceptionDays.filter(exception => exception.id !== day.id)
    })
  }

  /**
   * Renders exception hours block
   */
  private renderExceptionHoursBlock = () => {
    const { exceptionDays } = this.state;
    return exceptionDays.map((day: Weekday, index: number) => {
      return (
        <List.Item key={ index } style={{ marginBottom: "2rem" }}>
          <List.Content>
            <Form>
                <Form.Field style={{ display: "flex", marginBottom: "2rem", marginRight: "1.5rem" }}>
                  <Header style={{ marginRight: "1rem" }}>{ day.name }</Header>
                  <Button style={{ fontSize: "0.8rem" }} color="red" onClick={ this.deleteExceptionHoursBlock(day) }>{ strings.deleteBlock }</Button>
                </Form.Field>
                <Form.Field>
                  <span style={{ cursor: "pointer" }} onClick={ this.deleteExceptionHours(day) }>{ strings.deleteHours }<Icon style={{ marginRight: "1rem", marginLeft: "1rem" }} name="trash" /></span>
                  <span style={{ cursor: "pointer" }} onClick={ this.addExceptionHours(day) }>{ strings.addNewHours }<Icon style={{ marginRight: "1rem", marginLeft: "1rem" }} name="add circle" /></span>
                </Form.Field>
                {
                  day.hours.map((hour: OpeningHours, index: number) => {
                    return (
                      <Form.Group style={{ width: "15rem", marginRight: "1.5rem", display: "inline-block" }}>
                        { this.renderHoursRow(day, index, hour, true) }
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
   * Adds exception hours to the row
   * 
   * @param weekDay week day
   */
  private addExceptionHours = (weekDay: Weekday) => (event: any) => {
    const { exceptionDays } = this.state;
    const index = exceptionDays.findIndex(exception => exception.id === weekDay.id);
    if (index > -1) {
      const updatedExceptionDay = exceptionDays[index];
      updatedExceptionDay.hours = [
        ...updatedExceptionDay.hours,
        {
          opens: new Date(),
          closes: new Date()
        }
      ];
      exceptionDays.splice(index, 1, updatedExceptionDay);
      this.setState({
        exceptionDays: exceptionDays
      });
    }
  }

  /**
   * Deletes exception hour from the row
   * 
   * @param weekDay week day
   */
  private deleteExceptionHours = (weekDay: Weekday) => (event: any) => {
    const { exceptionDays } = this.state;
    const index = exceptionDays.findIndex(exception => exception.id === weekDay.id);
    if (index > -1) {
      const exceptionDay = exceptionDays[index];
      exceptionDay.hours.pop();
      exceptionDays[index] = exceptionDay;
      this.setState({
        exceptionDays: exceptionDays
      });
    }
  }

  /**
   * Adds opening hours to the item
   */
  private addOpeningHours = (weekDay: Weekday) => (event: any) => {
    const { weeks } = this.state;
    const updatedWeeks = weeks.map(week => {
      return {
        ...week,
        weekDays: week.weekDays.map(day => {
          if (day.id === weekDay.id) {
            return {
              ...day,
              hours: [
                ...day.hours,
                {
                  opens: new Date(),
                  closes: new Date()
                }
              ]
            }
          }
          return day;
        })
      }
    });
    this.setState({
      weeks: updatedWeeks
    });
  }

  /**
   * Deletes opening hour from the row 
   */
  private deleteOpeningHours = (weekDay: Weekday) => (event: any) => {
    const { weeks } = this.state;
    const updatedWeeks = weeks.map(week => {
      return {
        ...week,
        weekDays: week.weekDays.map(day => {
          if (day.id === weekDay.id) {
            const hours = day.hours;
            hours.pop();
            return {
              ...day,
              hours: hours
            }
          }
          return day;
        })
      }
    });
    this.setState({
      weeks: updatedWeeks
    });
  }
  
  /**
   * Renders single week day
   * 
   * @param day day
   */
  private renderWeekday = (day: Weekday) => {
    return (
      <Card style={{ width: "18rem", marginLeft: "0.4rem", marginRight: "0.4rem" }}>
        <Card.Header
          textAlign="center"
          style={{ backgroundColor: "#E51D2A", color: "#fff", fontSize: 16, padding: 5 }}
        >
          { day.name }
        </Card.Header>
        <Card.Content>
          <Form>
            <Form.Field>
              <Checkbox
                label={ strings.closed }
              />
            </Form.Field>
            {
              day.hours.map((hours, index) => this.renderHoursRow(day, index, hours))
            }
            <Form.Field>
              <span style={{ cursor: "pointer" }} onClick={ this.deleteOpeningHours(day) }>{ strings.deleteHours }<Icon style={{ marginRight: "1rem", marginLeft: "1rem" }} name="trash" /></span>
              <span style={{ cursor: "pointer" }} onClick={ this.addOpeningHours(day) }>{ strings.addNewHours }<Icon style={{ marginRight: "1rem", marginLeft: "1rem" }} name="add circle" /></span>
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
  private renderHoursRow = (day: Weekday, index: number, hours: OpeningHours, isException?: boolean) => {
    const openingHoursHandler = (openOrClose: "opens"|"closes") => (date: Date) => this.onChangeOpeningHours(day, index, openOrClose, date);
    const exceptionHoursHandler = (openOrClose: "opens"|"closes") => (date: Date) => this.onChangeExceptionHours(day, index, openOrClose, date);
    return (
      <Form.Group inline style={{ width: "15rem" }}>
        <Form.Field>
          <DatePicker
            selected={ hours.opens }
            onChange={ isException ? exceptionHoursHandler("opens") : openingHoursHandler("opens") }
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
            onChange={ isException ? exceptionHoursHandler("closes") : openingHoursHandler("closes") }
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
   */
  private onChangeOpeningHours = (day: Weekday, hoursIndex: number, key: string, value: Date | null) => {
    const { weeks } = this.state;
    const changedWeeks = weeks.map(week => {
      return {
        ...week,
        weekDays: week.weekDays.map(weekday => {
          if (weekday.id === day.id) {
            const hoursArray = weekday.hours;
            const hoursToUpdate = weekday.hours[hoursIndex];
            const updatedHoursRow = { ...hoursToUpdate, [key]: value !== null ? value : hoursToUpdate[key] };
            hoursArray.splice(hoursIndex, 1, updatedHoursRow);
            const updatedDay: Weekday = {
              ...weekday,
              hours: hoursArray
            };
            return updatedDay;
          }
          return weekday;
        }
      )};
    });

    this.setState({
      weeks: changedWeeks
    });
  }

  /**
   * Event handler for change exceptionday data
   */
  private onChangeExceptionHours = (day: Weekday, hoursIndex: number, key: string, value: Date | null) => {
    const { exceptionDays } = this.state;
    const changedDays = exceptionDays.map(exception => {
      if (exception.id === day.id) {
        const hoursArray = exception.hours;
        const hoursToUpdate = exception.hours[hoursIndex];
        const updatedHoursRow = { ...hoursToUpdate, [key]: value !== null ? value : hoursToUpdate[key] }
        hoursArray.splice(hoursIndex, 1, updatedHoursRow);
        const updatedDay: Weekday = {
          ...exception,
          hours: hoursArray
        };
        return updatedDay;
      }
      return exception;
    });

    this.setState({
      exceptionDays: changedDays
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