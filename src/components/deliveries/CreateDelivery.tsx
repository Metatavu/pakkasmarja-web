import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, Options, DeliveryDataValue, DeliveryNoteImage64 } from "src/types";
import Api, { Product, DeliveryPlace, ItemGroupCategory, Delivery, DeliveryNote, OpeningHourInterval, OpeningHourPeriod } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Header, Dropdown, Form, Input, Button, Divider, Image, Loader, Message } from "semantic-ui-react";
import "../../styles/common.css";
import BasicLayout from "../generic/BasicLayout";
import DeliveryNoteModal from "./DeliveryNoteModal";
import { Redirect } from "react-router";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "src/localization/strings";
import * as Moment from "moment";
import { extendMoment, MomentRangeStaticMethods } from "moment-range";
import PriceChart from "../generic/PriceChart";
import { FileService } from "src/api/file.service";
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import * as _ from "lodash";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Moment extended with moment-range
 */
const moment = extendMoment(Moment);

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
  deliveries?: DeliveriesState;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
}

/**
 * Interface for component state
 */
interface State {
  products: Product[];
  deliveryPlaces: DeliveryPlace[];
  selectedProductId?: string;
  selectedPlaceId: string;
  amount: number;
  date: Date;
  modalOpen: boolean;
  category: string;
  redirect: boolean;
  deliveryNotes: DeliveryNote[];
  deliveryNotesWithImageBase64: DeliveryNoteImage64[];
  deliveryTimeValue: string;
  openImage?: string;
  loading: boolean;
  selectedProduct?: Product;
  selectedTime?: Date;
  deliveryPlaceOpeningHours?: OpeningHourInterval[];
}

/**
 * Class for create delivery component
 */
class CreateDelivery extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      redirect: false,
      products: [],
      deliveryPlaces: [],
      selectedPlaceId: "",
      amount: 0,
      date: moment().startOf("day").toDate(),
      modalOpen: false,
      category: "",
      deliveryNotes: [],
      deliveryNotesWithImageBase64: [],
      loading: false,
      deliveryTimeValue: moment().minutes(0).format("HH:mm"),
    };
    registerLocale('fi', fi);
  }

  /**
   * Component did mount life cycle event
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    this.setState({ loading: true });
    const category: ItemGroupCategory = this.props.match.params.category;
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const unfilteredProducts = await productsService.listProducts(undefined, category, this.props.keycloak.subject, undefined, 100);
    const products: Product[] = unfilteredProducts.filter(product => product.active === true);
    this.setState({
      products,
      deliveryPlaces: deliveryPlaces.filter(deliveryPlace => deliveryPlace.name !== "Muu"),
      category,
      loading: false
    });
  }

  /**
   * Gets delivery place opening hours on a given date
   * 
   * @param date date object
   * @param deliveryPlaceId delivery place id
   */
  private getDeliveryPlaceOpeningHours = async (date: Date, deliveryPlaceId: string) => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return;
    }

    try {
      const openingHoursService = Api.getOpeningHoursService(keycloak.token);
      const openingHourPeriods = await openingHoursService.listOpeningHourPeriods(deliveryPlaceId, date, date);
      const openingHourExceptions = await openingHoursService.listOpeningHourExceptions(deliveryPlaceId);
      const chosenDate = moment(date);
      const exception = openingHourExceptions.find(item => {
        const exceptionDate = moment(item.exceptionDate);
        return exceptionDate.format("YYYY-MM-DD") === chosenDate.format("YYYY-MM-DD");
      });
      const period = openingHourPeriods.find(period => {
        const periodBegin = moment(period.beginDate);
        const periodEnd = moment(period.endDate);
        const sameAsBegin = chosenDate.format("YYYY-MM-DD") === periodBegin.format("YYYY-MM-DD");
        const sameAsEnd = chosenDate.format("YYYY-MM-DD") === periodEnd.format("YYYY-MM-DD");
        return chosenDate.isBetween(periodBegin, periodEnd) || sameAsBegin || sameAsEnd;
      });
      if (exception) {
        this.setState({
          deliveryPlaceOpeningHours: exception.hours,
          selectedTime: undefined
        });
      } else if (period) {
        const periodDay = this.getPeriodDay(period, chosenDate);
        if (periodDay !== undefined) {
          this.setState({
            deliveryPlaceOpeningHours: periodDay.hours,
            selectedTime: undefined
          });
        } else {
          this.setState({
            deliveryPlaceOpeningHours: undefined,
            selectedTime: undefined
          });
        }
      } else {
        this.setState({
          deliveryPlaceOpeningHours: undefined,
          selectedTime: undefined
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Gets chosen date day from period
   * 
   * @param period period
   * @param chosenDate chosen date
   */
  private getPeriodDay = (period: OpeningHourPeriod, chosenDate: MomentRangeStaticMethods & Moment.Moment) => {
    const periodDayCount = moment(period.endDate).diff(moment(period.beginDate), "days");
    const weekdays = period.weekdays.sort((a, b) => {
      const order = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
      return order.findIndex(item => item === a.dayType) - order.findIndex(item => item === b.dayType);
    });
    for (let i = 0; i < periodDayCount; i++) {
      const day = moment(period.beginDate).add(i, "days");
      if (day.format("YYYY-MM-DD") === chosenDate.format("YYYY-MM-DD")) {
        return weekdays[day.isoWeekday() - 1];
      }
    }
    return undefined;
  }

  /**
   * Handle input change
   * 
   * @param key key to change
   * @param value new value
   */
  private handleInputChange = (key: string, value: DeliveryDataValue ) => {
    if (key === "selectedProductId") {
      const selectedProductId = value && value.toString() || "";
      const selectedProduct = this.state.products.find(product => product.id === selectedProductId);
      this.setState({ selectedProductId, selectedProduct });
    }

    const state: State = this.state;
    state[key] = value;

    if (key === "date" || key === "selectedPlaceId") {
      this.getDeliveryPlaceOpeningHours(state.date, state.selectedPlaceId);
    }

    this.setState(state);
  }

  /**
   * Render dropdown
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
        onChange={(event, data) => {
          this.handleInputChange(key, data.value)
        }
        }
      />
    );
  }

  /**
   * Returns whether form is valid or not
   * 
   * @return whether form is valid or not
   */
  private isValid = () => {
    return !!(
      this.state.selectedProductId
      && this.state.selectedPlaceId
      && this.state.selectedTime
      && this.state.deliveryTimeValue
      && typeof this.state.amount === "number"
    );
  }

  /**
   * Add delivery note to state
   * 
   * @param deliveryNote deliveryNote
   */
  private addDeliveryNote = async (deliveryNote: DeliveryNote) => {
    if (!process.env.REACT_APP_API_URL || !this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const deliveryNotesWithImageBase64 = this.state.deliveryNotesWithImageBase64;
    if (deliveryNote.image) {
      const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
      const imageData = await fileService.getFile(deliveryNote.image || "");
      const src = `data:image/jpeg;base64,${imageData.data}`;
      deliveryNotesWithImageBase64.push({ text: deliveryNote.text, img64: src });
    } else {
      deliveryNotesWithImageBase64.push({ text: deliveryNote.text, img64: "" });
    }

    const deliveryNotes: DeliveryNote[] = this.state.deliveryNotes || [];
    deliveryNotes.push(deliveryNote);
    this.setState({ deliveryNotes, deliveryNotesWithImageBase64 });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.date || !this.props.keycloak.subject) {
      return;
    }
    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    let time: string | Date = moment(this.state.date).format("YYYY-MM-DD");
    time = `${time} ${this.state.deliveryTimeValue} +0000`;
    time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();

    const delivery: Delivery = {
      productId: this.state.selectedProductId,
      userId: this.props.keycloak.subject,
      time: time,
      status: "PLANNED",
      amount: this.state.amount,
      price: "0",
      deliveryPlaceId: this.state.selectedPlaceId
    }

    const createdDelivery = await deliveryService.createDelivery(delivery);
    const updatedDeliveries = this.getUpdatedDeliveryData(createdDelivery);
    this.props.deliveriesLoaded && this.props.deliveriesLoaded(updatedDeliveries);
    await Promise.all(this.state.deliveryNotes.map((deliveryNote): Promise<DeliveryNote | null> => {
      return this.createDeliveryNote(createdDelivery.id || "", deliveryNote);
    }));

    this.setState({ redirect: true });
  }

  /**
   * Get updated delivery data 
   * 
   * @param delivery delivery
   */
  private getUpdatedDeliveryData = (delivery: Delivery): DeliveriesState => {
    if (!this.props.deliveries) {
      return { frozenDeliveryData: [], freshDeliveryData: [] };
    }

    const deliveryProduct: DeliveryProduct = {
      delivery: delivery,
      product: this.state.products.find(product => product.id === delivery.productId)
    };

    const deliveries = { ... this.props.deliveries };
    if (this.state.category === "FROZEN") {
      deliveries.frozenDeliveryData.push(deliveryProduct);
    } else {
      deliveries.freshDeliveryData.push(deliveryProduct);
    }

    const deliveriesState: DeliveriesState = {
      freshDeliveryData: deliveries.freshDeliveryData || [],
      frozenDeliveryData: deliveries.frozenDeliveryData || []
    }

    return deliveriesState;
  }

  /**
   * Create delivery notes
   * 
   * @param deliveryId deliveryId
   * @param deliveryData delivery data
   */
  private async createDeliveryNote(deliveryId: string, deliveryData: DeliveryNote): Promise<DeliveryNote | null> {
    if (this.props.keycloak && this.props.keycloak.token && process.env.REACT_APP_API_URL) {
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      return deliveryService.createDeliveryNote(deliveryData, deliveryId || "");
    }

    return null;
  }

  /**
   * Remove note
   * 
   * @param note note with image
   * @param index note index
   */
  private removeNote = (note: DeliveryNoteImage64, index: number) => {
    const deliveryNotesWithImageBase64 = this.state.deliveryNotesWithImageBase64;
    const newNotesWith64 = deliveryNotesWithImageBase64.filter((note, i) => i !== index);
    const deliveryNotes = this.state.deliveryNotes;
    const newDeliveryNotes = deliveryNotes.filter((note, i) => i !== index);
    this.setState({ deliveryNotesWithImageBase64: newNotesWith64, deliveryNotes: newDeliveryNotes });
  }

  /**
   * Handler for selecting delivery time
   * 
   * @param date date object
   * @param event event object
   */
  private selectTimeHandler = (date: Date | null, event: React.SyntheticEvent<any> | undefined) => {
    if (date !== null) {
      const deliveryTimeValue = moment(date).format("HH:mm");
      this.setState({
        selectedTime: date,
        deliveryTimeValue: deliveryTimeValue
      });
    }
  }

  /**
   * Gets opening hours if selected delivery place has ones set for selected date
   * 
   * @returns date array if opening hours are found, otherwise undefined
   */
  private getOpeningHours = (): Date[] | undefined => {
    const { deliveryPlaceOpeningHours } = this.state;
    return deliveryPlaceOpeningHours ? this.convertToDateArray(deliveryPlaceOpeningHours) : undefined;
  }

  /**
   * Converts opening hours to date array
   * 
   * @param openingHours array of opening hours
   * @return array of dates
   */
  private convertToDateArray = (openingHours: OpeningHourInterval[]) => {
    return _.flatten(openingHours.map(this.mapToDateArray));
  }

  /**
   * Maps single opening hour interval to date array
   * 
   * @param interval opening hour interval
   * @returns array of dates
   */
  private mapToDateArray = (interval: OpeningHourInterval): Date[] => {
    const { opens, closes } = interval;
    const dateRange = moment.range(
      moment(opens),
      moment(closes)
    );
    const momentDateArray = Array.from(dateRange.by("minutes", { step: 15, excludeEnd: true }));
    return momentDateArray.map(date => date.toDate());
  }

  /**
   * Render method
   */
  public render() {
    const {
      redirect,
      deliveryPlaces,
      selectedPlaceId,
      products,
      selectedProduct,
      selectedProductId,
      category,
      amount,
      selectedTime,
      deliveryNotesWithImageBase64,
      modalOpen,
      openImage
    } = this.state;

    const includedHours = this.getOpeningHours();

    if (redirect) {
      return <Redirect to={{
        pathname: '/incomingDeliveries',
        state: { category: this.state.category }
      }} />;
    }

    const productOptions: Options[] = products && products.map((product) => {
      return {
        key: product.id,
        text: product.name,
        value: product.id
      };
    });

    const deliveryPlaceOptions: Options[] = deliveryPlaces && deliveryPlaces.map((deliveryPlace) => {
      return {
        key: deliveryPlace.id || "",
        text: deliveryPlace.name || "",
        value: deliveryPlace.id || ""
      };
    });

    return (
      <BasicLayout pageTitle={ "Uusi toimitus" }>
        <Header as="h2">
          Uusi { category === "FRESH" ? "tuore" : "pakaste" } toimitus
        </Header>
        { this.state.loading ?
          <Loader size="medium" content={ strings.loading } active /> :
          <Form>
            <Form.Field>
              <label>{ strings.product }</label>
              {
                products.length > 0 ?
                  this.renderDropDown(productOptions, strings.product, "selectedProductId") :
                  <p>Ei voimassa olevaa sopimusta. Jos näin ei pitäisi olla, ole yhteydessä Pakkasmarjaan.</p>
              }
            </Form.Field>
            { selectedProductId &&
              <Form.Field>
                <PriceChart time={ this.state.date } showLatestPrice productId={ selectedProductId } />
              </Form.Field>
            }
            <Form.Field>
              <label>{`${strings.amount} ( ${selectedProduct && selectedProduct.unitName || "Tuotetta ei ole valittu"} )`}</label>
              <Input
                placeholder={ strings.amount }
                value={ amount }
                type="number"
                min={0}
                onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                  const value = event.currentTarget.value ? parseInt(event.currentTarget.value) : "";
                  this.handleInputChange("amount", value);
                }}
              />
            </Form.Field>
            { amount && selectedProduct ?
              <Form.Field>
                <p>= <b>{ (amount * (selectedProduct.units * selectedProduct.unitSize)).toFixed(2) } KG</b></p>
              </Form.Field>
              : null
            }
            <Form.Field style={{ marginTop: 20 }}>
              <label>{ strings.deliveryPlace }</label>
              { this.renderDropDown(deliveryPlaceOptions, strings.deliveryPlace, "selectedPlaceId") }
            </Form.Field>
            <Form.Field>
              <label>{strings.deliveryDate}</label>
              <DatePicker
                disabled={ !this.state.selectedPlaceId }
                onChange={(date: Date) => {
                  this.handleInputChange("date", date)
                }}
                selected={this.state.date}
                dateFormat="eeeeee dd.MM.yyyy"
                locale="fi"
              />
            </Form.Field>
            <Form.Field style={{ marginTop: 20 }}>
              <label>Ajankohta</label>
              <DatePicker
                disabled={ !selectedPlaceId }
                selected={ selectedTime }
                onChange={ this.selectTimeHandler }
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={ 15 }
                timeCaption="Klo"
                locale="fi"
                dateFormat="HH.mm"
                timeFormat="HH.mm"
                includeTimes={ includedHours }
              />
            </Form.Field>
            { selectedPlaceId && includedHours !== undefined && includedHours.length === 0 &&
              <Message negative>
                <Message.Header>
                  Toimituspaikka on suljettu valittuna toimituspäivänä.
                </Message.Header>
              </Message>
            }
            { selectedPlaceId && includedHours === undefined &&
              <Message negative>
                <Message.Header>
                  Päivän aukioloajat voivat vielä muuttua.
                </Message.Header>
              </Message>
            }
            { deliveryNotesWithImageBase64.length > 0 ?
              deliveryNotesWithImageBase64.map((deliveryNote, i) => {
                return (
                  <React.Fragment key={`${deliveryNote.text} ${i}`}>
                    <h4 style={{ marginTop: 14 }}>
                      Huomio { i + 1 }
                    </h4>
                    <div style={{ marginBottom: 10 }} className="delivery-note-container">
                      <div className="delivery-note-img-container">
                        <p>
                          { deliveryNote.img64 ?
                            <Image
                              onClick={() => this.setState({ openImage: deliveryNote.img64 })}
                              src={ deliveryNote.img64 }
                              size="small"
                            /> :
                            "Huomiolla ei ole kuvaa"
                          }
                        </p>
                      </div>
                      <div className="delivery-note-text-container">
                        <p style={{ padding: 20 }}>
                          { deliveryNote.text }
                        </p>
                      </div>
                      <div style={{ display: "flex", flex: 0.2, minHeight: "100px", alignItems: "center" }}>
                        <Button onClick={() => this.removeNote(deliveryNote, i)} color="black">
                          Poista huomio
                        </Button>
                      </div>
                    </div>
                  </React.Fragment>
                )
              }) : null
            }
            <Button
              color="red"
              inverted
              onClick={() => this.setState({ modalOpen: true })}
            >
              {`${strings.addNote}`}
            </Button>
            <Divider />
            <Button.Group floated="right" >
              <Button
                onClick={() => this.setState({ redirect: true })}
                inverted
                color="red"
              >
                { strings.back }
              </Button>
              <Button.Or text="" />
              <AsyncButton
                disabled={ !this.isValid() }
                color="red"
                onClick={ this.handleDeliverySubmit }
                type='submit'
              >
                { category === "FRESH" ? strings.newFreshDelivery : strings.newFrozenDelivery }
              </AsyncButton>
            </Button.Group>
          </Form>
        }
        <DeliveryNoteModal
          modalOpen={ modalOpen }
          closeModal={ () => this.setState({ modalOpen: false }) }
          addDeliveryNote={ this.addDeliveryNote }
        />
        { openImage &&
          <Lightbox
            mainSrc={ openImage }
            onCloseRequest={ () => this.setState({ openImage: undefined }) }
          />
        }
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
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateDelivery);
