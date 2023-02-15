import * as React from "react";
import * as actions from "../../actions/";
import * as _ from "lodash";
import { StoreState, DeliveriesState, DeliveryProduct, Options, DeliveryDataValue, DeliveryNoteImage64 } from "src/types";
import Api, { Product, DeliveryPlace, ItemGroupCategory, Delivery, DeliveryNote, ProductPrice } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Header, Dropdown, Form, Input, Button, Divider, Image, Loader } from "semantic-ui-react";
import "../../styles/common.css";
import BasicLayout from "../generic/BasicLayout";
import DeliveryNoteModal from "./DeliveryNoteModal";
import { Redirect } from "react-router";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "src/localization/strings";
import * as moment from "moment";
import PriceChart from "../generic/PriceChart";
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import { FileService } from "src/api/file.service";
import AsyncButton from "../generic/asynchronous-button";
import { filterPossibleDeliveryPlaces, filterSupplierDeliveryTimes } from "src/utils";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveries?: DeliveriesState;
  match?: any;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
}

/**
 * Interface for component state
 */
interface State {
  products: Product[];
  productPrice?: ProductPrice;
  deliveryPlaces: DeliveryPlace[];
  selectedProductId?: string;
  selectedPlaceId?: string;
  amount: number;
  deliveryTime?: Date;
  modalOpen: boolean;
  category: string;
  redirect: boolean;
  deliveryNotes: DeliveryNote[];
  deliveryNotesWithImageBase64: DeliveryNoteImage64[];
  deliveryId?: string;
  openImage?: string;
  loading: boolean;
  selectedProduct?: Product;
}

/**
 * Class for edit delivery component
 */
class EditDelivery extends React.Component<Props, State> {

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
      modalOpen: false,
      category: "",
      deliveryNotes: [],
      deliveryNotesWithImageBase64: [],
      amount: 0,
      loading: false
    };
    registerLocale('fi', fi);
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    const { keycloak, deliveries, match } = this.props;
    if (!keycloak || !deliveries) return;

    const { token, subject } = keycloak;
    if (!token) return;

    this.setState({ loading: true });

    const category: ItemGroupCategory = match.params.category;
    const deliveryId: string = match.params.deliveryId;

    const delivery = await Api.getDeliveriesService(token).findDelivery(deliveryId);
    const deliveryPlaces = await Api.getDeliveryPlacesService(token).listDeliveryPlaces();
    const unfilteredProducts = await Api.getProductsService(token).listProducts(undefined, category, subject, undefined, 100);
    const products = unfilteredProducts.filter(product => product.active);
    const selectedProduct = products.find(product => product.id === delivery.productId);

    this.setState({
      products,
      deliveryPlaces: filterPossibleDeliveryPlaces(deliveryPlaces, category),
      category,
      deliveryId,
      amount: delivery.amount,
      selectedProductId: delivery.productId,
      selectedPlaceId: delivery.deliveryPlaceId,
      deliveryTime: moment.utc(delivery.time).toDate(),
      loading: false,
      selectedProduct
    });

    this.getNotes();
  }

  /**
   * Get notes
   */
  private getNotes = async () => {
    const { keycloak } = this.props;
    const { deliveryId } = this.state;

    if (!keycloak || !keycloak.token || !deliveryId || !process.env.REACT_APP_API_URL) {
      return;
    }

    const deliveryNotes = await Api.getDeliveriesService(keycloak.token).listDeliveryNotes(deliveryId);
    const fileService = new FileService(process.env.REACT_APP_API_URL, keycloak.token);
    const deliveryNotesWithImageBase64Promises = deliveryNotes.map(async note => {
      if (note.image) {
        const imageData = await fileService.getFile(note.image || "");
        const src = `data:image/jpeg;base64,${imageData.data}`
        const DeliveryNoteImage64: DeliveryNoteImage64 = { text: note.text, img64: src, id: note.id };
        return DeliveryNoteImage64;
      } else {
        const DeliveryNoteImage64: DeliveryNoteImage64 = { text: note.text, img64: "", id: note.id };
        return DeliveryNoteImage64;
      }

    })
    const deliveryNotesWithImageBase64 = await Promise.all(deliveryNotesWithImageBase64Promises.map(note => Promise.resolve(note)))
    this.setState({ deliveryNotes, deliveryNotesWithImageBase64 });
  }

  /**
   * Handle input change
   *
   * @param key key
   * @param value value
   */
  private handleInputChange = async (key: keyof State, value: DeliveryDataValue) => {
    if (key === "selectedProductId") {
      const selectedProductId = value && value.toString() || "";
      const selectedProduct = this.state.products.find(product => product.id === selectedProductId);
      this.setState({ selectedProductId, selectedProduct });
    }

    this.setState({ ...this.state, [key]: value });
  }

  /**
   * Render drop down
   *
   * @param options options
   * @param key key
   */
  private renderDropDown = (options: Options[], key: "selectedProductId" | "selectedPlaceId") => {
    if (options.length <= 0) {
      return <Dropdown fluid />;
    }
    const value = this.state[key];
    return (
      <Dropdown
        selection
        fluid
        value={value as string}
        options={options}
        onChange={(event, data) => {
          this.handleInputChange(key, data.value)
        }
        }
      />
    );
  }

  /**
   * Add delivery note to state
   *
   * @param deliveryNote deliveryNote
   */
  private addDeliveryNote = async (deliveryNote: DeliveryNote) => {
    const { deliveryNotes, deliveryNotesWithImageBase64 } = this.state;
    const token = this.props.keycloak?.token;
    const updatedNotesWithImageBase64 = [ ...deliveryNotesWithImageBase64 ];

    if (!process.env.REACT_APP_API_URL || !token) return;

    if (deliveryNote.image) {
      const imageData = await new FileService(process.env.REACT_APP_API_URL, token).getFile(deliveryNote.image || "");
      updatedNotesWithImageBase64.push({ text: deliveryNote.text, img64: `data:image/jpeg;base64,${imageData.data}` });
    } else {
      updatedNotesWithImageBase64.push({ text: deliveryNote.text, img64: "" });
    }

    this.setState({
      deliveryNotes: [ ...(deliveryNotes || []), deliveryNote ],
      deliveryNotesWithImageBase64: updatedNotesWithImageBase64
    });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    const { keycloak, deliveriesLoaded } = this.props;
    const {
      selectedPlaceId,
      selectedProductId,
      deliveryTime: time,
      deliveryId,
      amount,
      deliveryNotes
    } = this.state;
    const { token, subject } = keycloak || {};

    if (
      !token ||
      !subject ||
      !selectedPlaceId ||
      !selectedProductId ||
      !time ||
      !deliveryId
    ) {
      return;
    }

    const deliveryService = Api.getDeliveriesService(token);

    const updatedDelivery = await deliveryService.updateDelivery(
      {
        id: deliveryId,
        productId: selectedProductId,
        userId: subject,
        time: time,
        status: "PLANNED",
        amount: amount,
        price: "0",
        deliveryPlaceId: selectedPlaceId
      },
      deliveryId
    );

    const updatedDeliveries = this.getUpdatedDeliveryData(updatedDelivery);
    deliveriesLoaded && deliveriesLoaded(updatedDeliveries);

    await Promise.all(
      deliveryNotes.map(deliveryNote => this.createDeliveryNote(updatedDelivery.id || "", deliveryNote))
    );

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

    const deliveries = { ... this.props.deliveries };
    const freshDeliveries = deliveries.freshDeliveryData.map((deliveryData: DeliveryProduct) => {
      if (deliveryData.delivery.id === delivery.id) {
        return {
          delivery: delivery,
          product: this.state.products.find(product => product.id === delivery.productId)
        }
      }
      return deliveryData;
    });
    const frozenDeliveries = deliveries.frozenDeliveryData.map((deliveryData: DeliveryProduct) => {
      if (deliveryData.delivery.id === delivery.id) {
        return {
          delivery: delivery,
          product: this.state.products.find(product => product.id === delivery.productId)
        }
      }
      return deliveryData;
    });

    const deliveriesState: DeliveriesState = {
      freshDeliveryData: freshDeliveries || [],
      frozenDeliveryData: frozenDeliveries || []
    }
    return deliveriesState;
  }

  /**
   * Create delivery notes
   *
   * @param deliveryId deliveryId
   * @param deliveryNote deliveryNote
   */
  private async createDeliveryNote(deliveryId: string, deliveryData: DeliveryNote): Promise<DeliveryNote | null> {
    if (this.props.keycloak && this.props.keycloak.token && process.env.REACT_APP_API_URL && !deliveryData.id) {
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      return deliveryService.createDeliveryNote(deliveryData, deliveryId || "");
    }
    return null;
  }

  /**
   * Remove note
   */
  private removeNote = async (note: DeliveryNoteImage64, index: number) => {
    if (note.id) {
      if (!this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL || !this.state.deliveryId) {
        return;
      }
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      this.filterNotes(index);
      return deliveryService.deleteDeliveryNote(this.state.deliveryId, note.id);
    } else {
      this.filterNotes(index);
    }
  }

  /**
   * filter notes and add to state
   *
   * @param index
   */
  private filterNotes = (index: number) => {
    const deliveryNotesWithImageBase64 = this.state.deliveryNotesWithImageBase64;
    const newNotesWith64 = deliveryNotesWithImageBase64.filter((note, i) => i !== index);
    const deliveryNotes = this.state.deliveryNotes;
    const newDeliveryNotes = deliveryNotes.filter((note, i) => i !== index);
    this.setState({ deliveryNotesWithImageBase64: newNotesWith64, deliveryNotes: newDeliveryNotes });
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
      && this.state.deliveryTime
      && typeof this.state.amount === 'number'
    );
  }

  /**
   * Render method
   */
  public render() {
    const {
      redirect,
      category,
      deliveryTime,
      products,
      deliveryPlaces,
      selectedProduct,
      selectedProductId,
      loading,
      amount,
      deliveryNotesWithImageBase64,
      openImage,
      modalOpen
    } = this.state;

    if (redirect) {
      return <Redirect to={{
        pathname: '/incomingDeliveries',
        state: { category: category }
      }} />;
    }

    const productOptions = products.map<Options>(product => ({
      key: product.id,
      text: product.name,
      value: product.id
    }));

    const deliveryPlaceOptions = (deliveryPlaces || []).map<Options>(deliveryPlace => ({
      key: deliveryPlace.id || "",
      text: deliveryPlace.name || "",
      value: deliveryPlace.id || ""
    }));

    return (
      <BasicLayout>
        <Header as="h2">
          {strings.editDelivery}
        </Header>
        {loading ?
          <Loader size="medium" content={strings.loading} active /> :
          <Form>
            <Form.Field>
              <label>{strings.product}</label>
              { products.length > 0
                ? this.renderDropDown(productOptions, "selectedProductId")
                : <p>Ei voimassa olevaa sopimusta. Jos näin ei pitäisi olla, ole yhteydessä Pakkasmarjaan.</p>
              }
            </Form.Field>
            {selectedProductId &&
              <Form.Field>
                <PriceChart showLatestPrice productId={selectedProductId} />
              </Form.Field>
            }
            <Form.Field>
              <label>{`${strings.amount} ( ${selectedProduct && selectedProduct.unitName || "Tuotetta ei ole valittu"} )`}</label>
              <Input
                type="number"
                min={0}
                placeholder={strings.amount}
                value={amount}
                onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                  const value = event.currentTarget.value ? parseInt(event.currentTarget.value) : "";
                  this.handleInputChange("amount", value);
                }}
              />
            </Form.Field>
            {amount && selectedProduct ?
              <Form.Field>
                <p>= <b>{(amount * (selectedProduct.units * selectedProduct.unitSize)).toFixed(2)} KG</b></p>
              </Form.Field>
              : null
            }
            { deliveryTime &&
              <Form.Field>
                <label>{strings.deliveryDate}</label>
                <DatePicker
                  onChange={(date: Date) => {
                    this.handleInputChange("deliveryTime", date)
                  }}
                  selected={deliveryTime}
                  dateFormat="dd.MM.yyyy"
                  locale="fi"
                />
              </Form.Field>
            }
            <Form.Field style={{ marginTop: 20 }}>
              <label>Ajankohta</label>
              <DatePicker
                selected={ deliveryTime }
                onChange={ value => value && this.handleInputChange("deliveryTime", value as Date) }
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={ 15 }
                timeCaption="Klo"
                locale="fi"
                dateFormat="HH.mm"
                timeFormat="HH.mm"
                filterTime={filterSupplierDeliveryTimes}
              />
            </Form.Field>
            <Form.Field style={{ marginTop: 20 }}>
              <label>{strings.deliveryPlace}</label>
              {this.renderDropDown(deliveryPlaceOptions, "selectedPlaceId")}
            </Form.Field>
            {deliveryNotesWithImageBase64.length > 0  ?
              deliveryNotesWithImageBase64.map((deliveryNote, i) => {
                return (
                  <React.Fragment key={`${deliveryNote.text} ${i}`}>
                    <h4 style={{ marginTop: 5 }}>Huomio {i + 1}</h4>
                    <div style={{ marginBottom: 10 }} className="delivery-note-container">
                      <div className="delivery-note-img-container">
                        <p>{deliveryNote.img64 ? <Image onClick={() => this.setState({ openImage: deliveryNote.img64 })} src={deliveryNote.img64} size="small" /> : "Huomiolla ei ole kuvaa"}</p>
                      </div>
                      <div className="delivery-note-text-container">
                        <p style={{ padding: 20 }}> {deliveryNote.text}</p>
                      </div>
                      <div style={{ display: "flex", flex: 0.2, minHeight: "100px", alignItems: "center" }}>
                        <AsyncButton onClick={ async () => await this.removeNote(deliveryNote, i) } color="black">Poista huomio</AsyncButton>
                      </div>
                    </div>
                  </React.Fragment>
                )
              }) : null
            }
            <Button color="red" inverted onClick={() => this.setState({ modalOpen: true })}>{strings.addNote}</Button>
            <Divider />
            <Button.Group floated="right" >
              <Button
                onClick={() => this.setState({ redirect: true })}
                inverted
                color="red">{strings.back}</Button>
              <Button.Or text="" />
              <AsyncButton disabled={ !this.isValid() } color="red" onClick={ this.handleDeliverySubmit } type='submit'>{ strings.save }</AsyncButton>
            </Button.Group>
          </Form>}
        {openImage &&
          <Lightbox
            mainSrc={openImage}
            onCloseRequest={() => this.setState({ openImage: undefined })}
          />
        }
        <DeliveryNoteModal
          modalOpen={modalOpen}
          closeModal={() => this.setState({ modalOpen: false })}
          addDeliveryNote={this.addDeliveryNote}
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
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditDelivery);
