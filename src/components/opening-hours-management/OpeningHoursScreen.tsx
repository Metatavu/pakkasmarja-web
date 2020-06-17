import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Loader, Tab, Card, Form, Grid, Checkbox, Header, Button } from "semantic-ui-react";
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
  startDate: Date;
  endDate: Date;
  testWeek: Weekday[];
}

/**
 * Interface describing weekday
 */
interface Weekday {
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
    this.state = {
      loading: false,
      manageOpeningHoursRole: false,
      startDate: moment().toDate(),
      endDate: moment().toDate(),
      testWeek: [
        { name: "maanantai", hours: [{ ...hours }] },
        { name: "tiistai", hours: [{ ...hours }] },
        { name: "keskiviikko", hours: [{ ...hours }] },
        { name: "torstai", hours: [{ ...hours }] },
        { name: "perjantai", hours: [{ ...hours }] },
        { name: "lauantai", hours: [{ ...hours }] },
        { name: "sunnuntai", hours: [{ ...hours }] }
      ]
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
    this.setState({ loading: false, manageOpeningHoursRole });
  }

  // /**
  //  * Get time
  //  * 
  //  * @param date date
  //  */
  // private getTime(date?: Date) {
  //   return date ? new Date(date).getTime() : 0;
  // }

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
        {
          this.state.manageOpeningHoursRole &&
            <BasicLayout
              fluid
              redirectTo={ this.state.redirectTo }
              pageTitle={ strings.openingHoursManagement }
            >
              <Tab
                menu={{ secondary: true, pointing: true }}
                panes={ panes }
              />
            </BasicLayout>
        }

      </React.Fragment>
    );
  }

  /**
   * Renders edit tab
   */
  private renderEditTab = () => {

    return (
      <>
        <Grid padded style={{ display: "flex", justifyContent: "space-between" }}>
          <Header size="large" style={{ marginLeft: 20 }}>{ strings.defaultPeriods }</Header>
          <Button style={{ borderRadius: 0 }} color="red">
            { strings.newOpeningHoursPeriod }
          </Button>
        </Grid>
        { this.renderOpeningHoursBlock() }
        <Grid padded style={{ display: "flex", justifyContent: "space-between" }}>
          <Header size="large" style={{ marginLeft: 20 }}>{ strings.exceptionPeriods }</Header>
          <Button style={{ borderRadius: 0 }} color="red">
            { strings.newOpeningHoursPeriod }
          </Button>
        </Grid>
        { this.renderOpeningHoursBlock() }
      </>
    );
  }

  /**
   * Renders preview tab
   */
  private renderPreviewTab = () => {
    return null;
  }

  /**
   * Renders single opening hours block
   */
  private renderOpeningHoursBlock = () => {
    const { testWeek } = this.state;

    const weekDays = testWeek.map(day => {
      return (
        <Grid.Column>
          { this.renderWeekday(day) }
        </Grid.Column>
      );
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
              <Form.Field style={{ display: "flex", alignItems: "center" }}>
                <label>Aikavälillä</label>
                <DatePicker
                  onChange={(date: Date) => {
                    this.setState({ startDate: date });
                  }}
                  selected={ this.state.startDate }
                  dateFormat="dd.MM.yyyy"
                  locale="fi"
                />
              </Form.Field>
              <Form.Field style={{ display: "flex", alignItems: "center" }}>
                <label>-</label>
                <DatePicker
                  onChange={(date: Date) => {
                    this.setState({ endDate: date });
                  }}
                  selected={ this.state.endDate }
                  dateFormat="dd.MM.yyyy"
                  locale="fi"
                />
              </Form.Field>
            </Form.Group>
          </Form>
        </Card.Description>
        <Card.Content>
          <Grid
            columns={ 7 }
            centered
          >
            <Grid.Row>
              { weekDays }
            </Grid.Row>
          </Grid>
        </Card.Content>
      </Card>
    );
  }
  
  /**
   * Renders single week day
   * 
   * @param day day
   */
  private renderWeekday = (day: Weekday) => {
    return (
      <Card>
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
  private renderHoursRow = (day: Weekday, index: number, hours: OpeningHours) => {
    return (
      <Form.Group inline>
        <Form.Field>
          <DatePicker
            selected={ hours.opens }
            onChange={ date => this.onChangeOpeningHours(day, index, "opens", date) }
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
            onChange={ date => this.onChangeOpeningHours(day, index, "closes", date) }
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
    const week = [ ...this.state.testWeek ];
    const index = week.findIndex(weekday => weekday.name === day.name);
    if (!index) {
      return;
    }

    const hoursArray = week[index].hours;
    const hoursToUpdate = hoursArray[hoursIndex];
    const updatedHoursRow = { ...hoursToUpdate, [key]: value !== null ? value : hoursToUpdate[key] };
    hoursArray.splice(hoursIndex, 1, updatedHoursRow);
    const updatedDay = { ...week[index], hours: hoursArray };
    week.splice(index, 1, updatedDay);

    this.setState({
      testWeek: week
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