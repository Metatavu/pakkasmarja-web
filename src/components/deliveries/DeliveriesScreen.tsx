import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, DeliveryProduct, DeliveriesState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { Product, ItemGroupCategory, OpeningHourPeriod, DeliveryPlace, OpeningHourException, OpeningHourWeekday, OpeningHourInterval } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Grid, Header, Icon, Image, SemanticICONS, Menu, Loader, Button, Table, Select, DropdownProps } from "semantic-ui-react";
import { Delivery } from "pakkasmarja-client";
import strings from "src/localization/strings";
import { Redirect } from "react-router";
import * as _ from "lodash";
import FreshIcon from "../../gfx/fresh-icon.png";
import FrozenIcon from "../../gfx/frozen-icon.png";
import * as moment from "moment";

moment.locale("fi");


/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
  location?: any;
}

/**
 * Interface for component state
 */
interface State {
  today?: moment.Moment;
  fourWeeksFromToday?: moment.Moment;
  keycloak?: Keycloak.KeycloakInstance;
  itemGroups?: ItemGroup[];
  activeItem?: string;
  tabActiveItem?: string;
  pageTitle: string;
  redirect: boolean;
  redirectTo?: string;
  redirectObj?: {};
  proposalCount?: number;
  incomingDeliveriesCount?: number;
  deliveries?: DeliveriesState;
  loading: boolean;
  openingHours: OpeningHourPeriod[];
  deliveryPlaces: DeliveryPlace[];
  deliveryPlacesOpeningHours: DeliveryPlaceOpeningHours[];
  selectedDeliveryPlaceOpeningHours?: DeliveryPlaceOpeningHours
}

interface DeliveryPlaceOpeningHours {
  id: string;
  name: string;
  openingHourPeriods: OpeningHourPeriod[];
  openingHourExceptions: OpeningHourException[];
}

/**
 * Class for deliveries screen component
 */
class DeliveriesScreen extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      pageTitle: "Toimitukset",
      redirect: false,
      loading: false,
      openingHours: [],
      deliveryPlaces: [],
      deliveryPlacesOpeningHours: []
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    this.setState({ loading: true });
    await Promise.all([
      this.loadDeliveriesData(),
      this.fetchDeliveryPlacesFromContract()
    ]);
    this.listDeliveryPlaceOpeningHours();
    this.setTabCounts();
    this.setState({ loading: false });
  }

  /**
   * Component did update life-sycle event
   */
  public componentDidUpdate = (prevProps: Props, prevState: State) => {
    if (prevState.tabActiveItem != this.state.tabActiveItem) {
      this.setTabCounts();
    }
  }

  /**
   * Sets tabs counts
   */
  private setTabCounts = () => {
    const deliveries = this.state.deliveries;
    if (deliveries) {
      if (this.state.tabActiveItem === "FRESH") {
        const proposalCount = _.filter(deliveries.freshDeliveryData, ({ delivery }) => delivery.status === "PROPOSAL").length;
        const incomingDeliveriesCount = _.filter(deliveries.freshDeliveryData, ({ delivery }) => delivery.status === "PLANNED").length;
        this.setState({ proposalCount, incomingDeliveriesCount });
      } else {
        const proposalCount = _.filter(deliveries.frozenDeliveryData, ({ delivery }) => delivery.status === "PROPOSAL").length;
        const incomingDeliveriesCount = _.filter(deliveries.frozenDeliveryData, ({ delivery }) => delivery.status === "PLANNED").length;
        this.setState({ proposalCount, incomingDeliveriesCount });
      }
    }
  }

  /**
   * Load deliveries
   */
  private loadDeliveriesData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const userId = this.props.keycloak.subject;

    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const productsService = await Api.getProductsService(this.props.keycloak.token);

    const freshDeliveries: Delivery[] = await deliveriesService.listDeliveries(userId, undefined, "FRESH", undefined, undefined, undefined, undefined, undefined, 0, 200);
    const frozenDeliveries: Delivery[] = await deliveriesService.listDeliveries(userId, undefined, "FROZEN", undefined, undefined, undefined, undefined, undefined, 0, 200);
    const unfilteredProducts: Product[] = await productsService.listProducts(undefined, undefined, undefined, undefined, 100);
    const products: Product[] = unfilteredProducts.filter(product => product.active === true);

    const freshDeliveriesAndProducts: DeliveryProduct[] = freshDeliveries.map((delivery) => {
      return {
        delivery: delivery,
        product: products.find(product => product.id === delivery.productId),
      };
    });

    const frozenDeliveriesAndProducts: DeliveryProduct[] = frozenDeliveries.map((delivery) => {
      return {
        delivery: delivery,
        product: products.find(product => product.id === delivery.productId)
      };
    });

    const deliveriesState: DeliveriesState = {
      freshDeliveryData: freshDeliveriesAndProducts,
      frozenDeliveryData: frozenDeliveriesAndProducts
    };

    this.setState({ deliveries: deliveriesState });
    this.props.deliveriesLoaded && this.props.deliveriesLoaded(deliveriesState);
  }

  /**
   * Fetches contract and extracts delivery place from it
   */
  private fetchDeliveryPlacesFromContract = async () => {
    const { keycloak } = this.props;
    if (!keycloak) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    const contractsService = Api.getContractsService(token);
    const deliveryPlacesService = Api.getDeliveryPlacesService(token);
    const userContracts = await contractsService.listContracts("application/json", undefined, undefined, undefined, new Date().getFullYear());
    const deliveryPlacePromises: Promise<DeliveryPlace>[] = [];
    userContracts.forEach(contract => {
      const deliveryPlace = deliveryPlacesService.findDeliveryPlace(contract.deliveryPlaceId)
      deliveryPlacePromises.push(deliveryPlace);
    });
    const deliveryPlaces = await Promise.all(deliveryPlacePromises);
    this.setState({
      deliveryPlaces: deliveryPlaces
    });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect && this.state.redirectTo) {
      return (
        <Redirect to={{
          pathname: `${this.state.redirectTo}`,
          state: this.state.redirectObj
        }} />
      );
    }
    const { tabActiveItem } = this.state;
    const tabs: { value: string, pageTitle: string, src: SemanticICONS, count?: number }[] = [
      {
        value: "proposals",
        pageTitle: "Ehdotukset",
        src: "edit outline",
        count: this.state.proposalCount && this.state.proposalCount
      },
      {
        value: "incomingDeliveries",
        pageTitle: "Tulevat toimitukset",
        src: "truck",
        count: this.state.incomingDeliveriesCount && this.state.incomingDeliveriesCount
      },
      {
        value: "pastDeliveries",
        pageTitle: "Tehdyt toimitukset",
        src: "check circle outline"
      }
    ]

    if (tabActiveItem === undefined) {
      return (
        <BasicLayout pageTitle={ this.state.pageTitle }>
          <Grid centered>
            <Grid.Row>
              <Grid.Column width={4}>
                <Button basic fluid color="red" size="large" onClick={ () => this.onSelectCategory(ItemGroupCategory.FRESH) }>
                  <Image avatar src={ FreshIcon } style={{ marginRight: "5%" }} />
                  <span style={{ color: "black" }}>{ strings.freshCategory }</span>
                </Button>
              </Grid.Column>
            </Grid.Row>
            <Grid.Row>
              <Grid.Column width={4}>
                <Button basic fluid color="red" size="large" onClick={ () => this.onSelectCategory(ItemGroupCategory.FROZEN) }>
                  <Image avatar src={ FrozenIcon } style={{ marginRight: "5%" }} />
                  <span style={{ color: "black" }}>{ strings.frozenCategory }</span>
                </Button>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </BasicLayout>
      );
    } else {
      return (
        <BasicLayout pageTitle={`${tabActiveItem === "FRESH" ? "Tuore, " : "Pakastukseen, "} ${this.state.pageTitle.toLowerCase()}`}>
          <Grid>
            <Grid.Column width={4}></Grid.Column>
            <Grid.Column width={8}>
              <Menu color="red" pointing secondary widths={2}>
                <Menu.Item name={strings.freshCategory} active={tabActiveItem === 'FRESH'} onClick={() => this.setState({ tabActiveItem: "FRESH" })}>
                  <Image avatar src={ FreshIcon } style={{ marginRight: "5%" }} />
                  { strings.freshCategory }
                </Menu.Item>
                <Menu.Item name={strings.frozenCategory} active={tabActiveItem === 'FROZEN'} onClick={() => this.setState({ tabActiveItem: "FROZEN" })}>
                <Image avatar src={ FrozenIcon } style={{ marginRight: "5%" }} />
                  { strings.frozenCategory }
                </Menu.Item>
              </Menu>
            </Grid.Column>
            <Grid.Column width={4}></Grid.Column>
          </Grid>
          {this.state.loading ?
            <Loader size="medium" content={strings.loading} active /> :
            <Grid verticalAlign='middle'>
              {
                tabs.map((tab) => {
                  return (
                    <Grid.Row key={tab.value}>
                      <Grid.Column width={4}>
                      </Grid.Column>
                      <Grid.Column textAlign="right" width={2}>
                        <Icon color="red" name={tab.src} size='huge' />
                      </Grid.Column>
                      <Grid.Column style={{ height: 40 }} width={6} className="open-modal-element" onClick={() => this.handleTabChange(tab.value)}>
                        <Header style={{ display: "inline" }}>{tab.pageTitle}</Header>
                        {
                          tab.count ?
                            <div className="delivery-count-container"><p>{tab.count}</p></div>
                            : null
                        }
                      </Grid.Column>
                      <Grid.Column width={4}>
                      </Grid.Column>
                    </Grid.Row>
                  );
                })
              }
              <Grid.Row>
                <Grid.Column width={4}></Grid.Column>
                  <Grid.Column width={8}>
                  <Select style={{ width: "100%", marginTop: "2rem", marginBottom: "2rem" }} placeholder='Valitse toimituspaikka' options={ this.mapOptions() } onChange={ this.chooseDeliveryPlaceOpeningHours } />
                  {
                    this.renderOpeningHours()
                  }
                  </Grid.Column>
                <Grid.Column width={4}></Grid.Column>
              </Grid.Row>
              
            </Grid>}
        </BasicLayout>
      );
    }
  }

  /**
   * Method for choosing delivery place opening hours
   * 
   * @param event event object
   * @param data dropdown props
   */
  private chooseDeliveryPlaceOpeningHours = (event: React.SyntheticEvent<HTMLElement>, data: DropdownProps) => {
    const { value } = data;
    if (value) {
      const place = this.state.deliveryPlacesOpeningHours.find(item => item.id === value);
      if (place) {
        this.setState({
          selectedDeliveryPlaceOpeningHours: place
        });
      }
    }
  }

  /**
   * Maps options for dropdown
   */
  private mapOptions = () => {
    return this.state.deliveryPlacesOpeningHours.map(deliveryPlaceOpeningHours => {
      return {
        value: deliveryPlaceOpeningHours.id,
        text: deliveryPlaceOpeningHours.name
      }
    });
  }

  /**
   * Renders opening hours
   */
  private renderOpeningHours = () => {
    const { selectedDeliveryPlaceOpeningHours } = this.state;
    if (!selectedDeliveryPlaceOpeningHours) {
      return;
    }
    return (
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell colSpan="2">{ selectedDeliveryPlaceOpeningHours.name }</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Päivämäärä</Table.HeaderCell>
            <Table.HeaderCell>Aukioloajat</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {
            this.renderOpeningHourPeriods(selectedDeliveryPlaceOpeningHours)
          }
        </Table.Body>
      </Table>
    );
  }

  /**
   * Renders opening hour periods
   * 
   * @param deliveryPlaceOpeningHours
   */
  private renderOpeningHourPeriods = (deliveryPlaceOpeningHours: DeliveryPlaceOpeningHours) => {
    const { today, fourWeeksFromToday } = this.state;
    if (!today || !fourWeeksFromToday) {
      return;
    }
    const periods = deliveryPlaceOpeningHours.openingHourPeriods;
    periods.sort((a, b) => {
      return moment(a.beginDate).diff(b.beginDate);
    });

    const result: JSX.Element[] = [];
    
    periods.map((period, index) => {
      let beginDate = moment(period.beginDate).startOf("day");
      let endDate = moment(period.endDate).endOf("day");
      if (beginDate.toDate().getTime() < today.toDate().getTime()) {
        beginDate = moment(today);
      }
      if (endDate.toDate().getTime() > fourWeeksFromToday.toDate().getTime()) {
        endDate = moment(fourWeeksFromToday);
      }
      const dayCount = endDate.diff(beginDate, "days") + 1;
      for (let i = 0; i < dayCount; i++) {
        const day = beginDate;
        const exceptionHours = deliveryPlaceOpeningHours.openingHourExceptions
          .find(exception => moment(exception.exceptionDate).isSame(day, "day") );
        if (exceptionHours && exceptionHours.hours && exceptionHours.hours.length) {
          result.push(this.renderOpeningException(day, exceptionHours, index));
        } else {
          result.push(this.renderOpeningHourPeriod(day, period.weekdays[day.weekday()], index));
        }
        beginDate.add(1, "day")
      }
    });
    return result;
  }

  private renderOpeningException = (day: moment.Moment, exception: OpeningHourException, key: number) => {
    return (
      <Table.Row key={ key }>
        <Table.Cell>
          { day.format("DD.MM.YYYY") }
        </Table.Cell>
        <Table.Cell>
          { exception.hours.length > 0 &&
            this.renderOpeningHourIntervals(exception.hours) ||
            <div>{ strings.closed }</div>
          }
        </Table.Cell>
      </Table.Row>
    );
  }

  private renderOpeningHourPeriod = (day: moment.Moment, weekday: OpeningHourWeekday, key: number): JSX.Element => {
    return (
      <Table.Row key={ key }>
        <Table.Cell>
          { day.format("DD.MM.YYYY") }
        </Table.Cell>
        <Table.Cell>
          { weekday.hours.length > 0 &&
            this.renderOpeningHourIntervals(weekday.hours) ||
            <div>{ strings.closed }</div>
          }
        </Table.Cell>
      </Table.Row>
    );
  }

  private renderOpeningHourIntervals = (hours: OpeningHourInterval[]) => {
    return hours.map(hour => {
      return <div>{ `${moment(hour.opens).format('HH:mm')} - ${moment(hour.closes).format('HH:mm')}` }</div>;
    });
  }

  /**
   * Lists opening hours in the delivery place for the next four weeks
   * 
   * @param event event object
   * @param data dropdown props
   */
  private listDeliveryPlaceOpeningHours = async () => {
    const { keycloak } = this.props;
    const { deliveryPlaces } = this.state;
    if (!keycloak || deliveryPlaces.length === 0) {
      return;
    }
    const { token } = keycloak;
    if (!token) {
      return;
    }
    const openingHoursService = Api.getOpeningHoursService(token);
    const today = moment();
    const fourWeeksFromToday = moment(today).add(28, "day");
    const deliveryPlacesOpeningHoursPromises = deliveryPlaces.map(async (deliveryPlace) => {
      const name = deliveryPlace.name;
      const deliveryPlaceId = `${ deliveryPlace.id }`;
      const [openingHourExceptions, openingHourPeriods] = await Promise.all([
        openingHoursService.listOpeningHourExceptions(deliveryPlaceId),
        openingHoursService.listOpeningHourPeriods(deliveryPlaceId, today.toDate(), fourWeeksFromToday.toDate())
      ]);
      return {
        id: deliveryPlaceId,
        name: name || "",
        openingHourPeriods: openingHourPeriods,
        openingHourExceptions: openingHourExceptions
      };
    });
    const deliveryPlacesOpeningHours =  await Promise.all(deliveryPlacesOpeningHoursPromises);
    this.setState({
      today,
      fourWeeksFromToday,
      deliveryPlacesOpeningHours
    });
  }

  /**
   * Handles tab change
   */
  private handleTabChange = (value: string) => {
    this.setState({ redirectTo: value, redirect: true, redirectObj: { category: this.state.tabActiveItem } });
  }

  private onSelectCategory = (category: ItemGroupCategory) => {
    this.setState({ tabActiveItem: category });
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
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries)),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(DeliveriesScreen);
