import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, Options, DeliveryDataValue, DeliveryNoteImage64 } from "src/types";
import Api, { Product, DeliveryPlace, ItemGroupCategory, Delivery, DeliveryNote } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Header, Dropdown, Form, Input, Button, Divider, Image, Loader } from "semantic-ui-react";
import "../../styles/common.css";
import BasicLayout from "../generic/BasicLayout";
import DeliveryNoteModal from "./DeliveryNoteModal";
import { Redirect } from "react-router";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from "date-fns/esm/locale/fi";
import strings from "src/localization/strings";
import * as Moment from "moment";
import { extendMoment } from "moment-range";
import PriceChart from "../generic/PriceChart";
import { FileService } from "src/api/file.service";
import Lightbox from "react-image-lightbox";
import "react-image-lightbox/style.css";
import * as _ from "lodash";
import AsyncButton from "../generic/asynchronous-button";
import AppConfig from "src/utils/AppConfig";
import { filterPossibleDeliveryPlaces, filterSupplierDeliveryTimes } from "src/utils";

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
  deliveryTimeValue?: string;
  openImage?: string;
  loading: boolean;
  selectedProduct?: Product;
  productRequiresConfirmation?: boolean;
  confirmed?: boolean;
  selectedTime?: Date;
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
      loading: false
    };
    registerLocale("fi", fi);
  }

  /**
   * Component did mount life cycle event
   */
  public componentDidMount = async () => {
    const { match, keycloak } = this.props;
    if (!keycloak) return;

    const { token, subject } = keycloak;
    if (!token) return;

    const category: ItemGroupCategory = match.params.category;

    this.setState({ loading: true });

    const deliveryPlaces = await Api
      .getDeliveryPlacesService(token)
      .listDeliveryPlaces();
    const unfilteredProducts = await Api
      .getProductsService(token)
      .listProducts(undefined, category, subject, undefined, 100);

    this.setState({
      products: unfilteredProducts.filter(product => product.active),
      deliveryPlaces: filterPossibleDeliveryPlaces(deliveryPlaces, category),
      category: category,
      loading: false
    });
  }

  /**
   * Returns whether given product requires confirmation before it can be delivered
   *
   * @param product product
   */
  private productRequiresConfirmation = async (product?: Product) => (
    !!product?.id &&
    !!_.get(await AppConfig.getAppConfig(), [ "item-groups", product.itemGroupId, "require-confirmation" ])
  );

  /**
   * Handle input change
   *
   * @param key key to change
   * @param value new value
   */
  private handleInputChange = async (key: string, value: DeliveryDataValue) => {
    const { products } = this.state;

    if (key === "selectedProductId") {
      const selectedProductId = value?.toString() || "";
      const selectedProduct = products.find(product => product.id === selectedProductId);

      if (selectedProduct) {
        this.setState({
          selectedProductId: selectedProductId,
          selectedProduct: selectedProduct,
          productRequiresConfirmation: await this.productRequiresConfirmation(selectedProduct)
        });
      }
    }

    this.setState({ ...this.state, [key]: value });
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
    const { selectedProductId, selectedPlaceId, selectedTime, deliveryTimeValue, amount } = this.state;
    return !!(
      selectedProductId
      && selectedPlaceId
      && selectedTime
      && deliveryTimeValue
      && typeof amount === "number"
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
    const { keycloak, deliveriesLoaded } = this.props;
    const {
      selectedPlaceId,
      selectedProductId,
      date,
      deliveryTimeValue,
      amount,
      deliveryNotes
    } = this.state;

    if (
      !keycloak?.token ||
      !keycloak.subject ||
      !selectedPlaceId ||
      !selectedProductId ||
      !date ||
      !deliveryTimeValue
    ) {
      return;
    }

    const [ hours, minutes ] = deliveryTimeValue.split(":");

    const time = moment(date)
      .hours(Number(hours))
      .minutes(Number(minutes))
      .toDate();

    const createdDelivery = await Api.getDeliveriesService(keycloak.token).createDelivery({
      productId: selectedProductId,
      userId: keycloak.subject,
      time: time,
      status: "PLANNED",
      amount: amount,
      price: "0",
      deliveryPlaceId: selectedPlaceId
    });

    const updatedDeliveries = this.addDeliveryToData(createdDelivery);

    deliveriesLoaded?.(updatedDeliveries);

    await Promise.all(
      deliveryNotes.map(deliveryNote => this.createDeliveryNote(createdDelivery.id || "", deliveryNote))
    );

    this.setState({ redirect: true });
  }

  /**
   * Adds given delivery to delivery data
   *
   * @param delivery delivery
   */
  private addDeliveryToData = (delivery: Delivery): DeliveriesState => {
    const { deliveries } = this.props;
    const { products, category } = this.state;

    if (!deliveries) {
      return {
        frozenDeliveryData: [],
        freshDeliveryData: []
      };
    }

    const deliveryProduct: DeliveryProduct = {
      delivery: delivery,
      product: products.find(product => product.id === delivery.productId)
    };

    const updatedDeliveries: DeliveriesState = {
      freshDeliveryData: deliveries.freshDeliveryData || [],
      frozenDeliveryData: deliveries.frozenDeliveryData || []
    };

    if (category === "FROZEN") {
      updatedDeliveries.frozenDeliveryData.push(deliveryProduct);
    } else {
      updatedDeliveries.freshDeliveryData.push(deliveryProduct);
    }

    return updatedDeliveries;
  }

  /**
   * Create delivery notes
   *
   * @param deliveryId deliveryId
   * @param deliveryData delivery data
   */
  private async createDeliveryNote(deliveryId: string, deliveryData: DeliveryNote) {
    const { keycloak } = this.props;

    if (!keycloak || !keycloak.token) return;

    return Api
      .getDeliveriesService(keycloak.token)
      .createDeliveryNote(deliveryData, deliveryId || "");
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
   */
  private selectTimeHandler = (date: Date | null) => {
    if (date !== null) {
      const deliveryTimeValue = moment(date).format("HH:mm");
      this.setState({
        selectedTime: date,
        deliveryTimeValue: deliveryTimeValue
      });
    }
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

    if (redirect) {
      return <Redirect to={{
        pathname: "/incomingDeliveries",
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
                filterTime={ filterSupplierDeliveryTimes }
              />
            </Form.Field>
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
                type="submit"
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
