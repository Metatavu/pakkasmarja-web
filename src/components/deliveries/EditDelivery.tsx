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
  date: Date;
  modalOpen: boolean;
  category: string;
  redirect: boolean;
  deliveryNotes: DeliveryNote[];
  deliveryNotesWithImageBase64: DeliveryNoteImage64[];
  deliveryId?: string;
  deliveryTimeValue: number;
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
      date: new Date(),
      modalOpen: false,
      category: "",
      deliveryNotes: [],
      deliveryNotesWithImageBase64: [],
      amount: 0,
      deliveryTimeValue: 11,
      loading: false
    };
    registerLocale('fi', fi);
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.deliveries) {
      return;
    }
    this.setState({ loading: true });

    const category: ItemGroupCategory = this.props.match.params.category;
    const deliveryId: string = this.props.match.params.deliveryId;

    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const delivery = await deliveriesService.findDelivery(deliveryId);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const unfilteredProducts: Product[] = await productsService.listProducts(undefined, category, this.props.keycloak.subject, undefined, 100);
    const products: Product[] = unfilteredProducts.filter(product => product.active === true);
    const selectedProduct = products.find(product => product.id === delivery.productId);
    const deliveryTimeValue = Number(moment(delivery.time).utc().format("HH"));
    await this.setState({
      products,
      deliveryPlaces: deliveryPlaces.filter(deliveryPlace => deliveryPlace.id !== "OTHER"),
      category,
      deliveryId,
      amount: delivery.amount,
      selectedProductId: delivery.productId,
      selectedPlaceId: delivery.deliveryPlaceId,
      date: delivery.time,
      deliveryTimeValue,
      loading: false,
      selectedProduct
    });
    this.getNotes();
  }

  /**
   * Get notes
   */
  private getNotes = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.deliveryId || !process.env.REACT_APP_API_URL) {
      return;
    }
    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const deliveryNotes = await deliveriesService.listDeliveryNotes(this.state.deliveryId);
    const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
    const deliveryNotesWithImageBase64Promises = deliveryNotes.map(async (note) => {
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
  private handleInputChange = async (key: string, value: DeliveryDataValue) => {
    if (key === "selectedProductId") {
      const selectedProductId = value && value.toString() || "";
      const selectedProduct = this.state.products.find(product => product.id === selectedProductId);
      this.setState({ selectedProductId, selectedProduct });
    }

    const state: State = this.state;
    state[key] = value;

    this.setState(state);
  }

  /**
   * Render drop down
   *
   * @param options options
   * @param key key
   */
  private renderDropDown = (options: Options[], key: string) => {
    if (options.length <= 0) {
      return <Dropdown fluid />;
    }
    const value = this.state[key];
    return (
      <Dropdown
        selection
        fluid
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
      const src = `data:image/jpeg;base64,${imageData.data}`
      deliveryNotesWithImageBase64.push({ text: deliveryNote.text, img64: src });
    } else {
      deliveryNotesWithImageBase64.push({ text: deliveryNote.text, img64: "" });
    }

    const deliveryNotes: DeliveryNote[] = this.state.deliveryNotes || [];
    deliveryNotes.push(deliveryNote);
    this.setState({ deliveryNotes, deliveryNotesWithImageBase64: deliveryNotesWithImageBase64 });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.keycloak.subject || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.date || !this.state.deliveryId) {
      return;
    }

    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    let time: string | Date = moment(this.state.date).format("YYYY-MM-DD");
    time = `${time} ${this.state.deliveryTimeValue}:00 +0000`
    time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();
    const delivery: Delivery = {
      id: this.state.deliveryId,
      productId: this.state.selectedProductId,
      userId: this.props.keycloak.subject,
      time: time,
      status: "PLANNED",
      amount: this.state.amount,
      price: "0",
      deliveryPlaceId: this.state.selectedPlaceId
    }

    const updatedDelivery = await deliveryService.updateDelivery(delivery, this.state.deliveryId);
    const updatedDeliveries = this.getUpdatedDeliveryData(updatedDelivery);
    this.props.deliveriesLoaded && this.props.deliveriesLoaded(updatedDeliveries);

    await Promise.all(this.state.deliveryNotes.map((deliveryNote): Promise<DeliveryNote | null> => {
      return this.createDeliveryNote(updatedDelivery.id || "", deliveryNote);
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
      && this.state.deliveryTimeValue
      && typeof this.state.amount === 'number'
    );
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to={{
        pathname: '/incomingDeliveries',
        state: { category: this.state.category }
      }} />;
    }

    const productOptions: Options[] = this.state.products.map((product) => {
      return {
        key: product.id,
        text: product.name,
        value: product.id
      };
    });

    const deliveryPlaceOptions: Options[] = this.state.deliveryPlaces && this.state.deliveryPlaces.map((deliveryPlace) => {
      return {
        key: deliveryPlace.id || "",
        text: deliveryPlace.name || "",
        value: deliveryPlace.id || ""
      };
    }) || [];

    const deliveryTimeValue: Options[] = [{
      key: "deliveryTimeValue1",
      text: "Ennen kello 12",
      value: 11
    }, {
      key: "deliveryTimeValue2",
      text: "Jälkeen kello 12",
      value: 17
    }]

    return (
      <BasicLayout>
        <Header as="h2">
          {strings.editDelivery}
        </Header>
        {this.state.loading ?
          <Loader size="medium" content={strings.loading} active /> :
          <Form>
            <Form.Field>
              <label>{strings.product}</label>
              {
                this.state.products.length > 0 ?
                  this.renderDropDown(productOptions, "selectedProductId")
                  :
                  <p>Ei voimassa olevaa sopimusta. Jos näin ei pitäisi olla, ole yhteydessä Pakkasmarjaan.</p>
              }
            </Form.Field>
            {this.state.selectedProductId &&
              <Form.Field>
                <PriceChart showLatestPrice productId={this.state.selectedProductId} />
              </Form.Field>
            }
            <Form.Field>
              <label>{`${strings.amount} ( ${this.state.selectedProduct && this.state.selectedProduct.unitName || "Tuotetta ei ole valittu"} )`}</label>
              <Input
                type="number"
                min={0}
                placeholder={strings.amount}
                value={this.state.amount}
                onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                  const value = event.currentTarget.value ? parseInt(event.currentTarget.value) : "";
                  this.handleInputChange("amount", value);
                }}
              />
            </Form.Field>
            {this.state.amount && this.state.selectedProduct ?
              <Form.Field>
                <p>= <b>{(this.state.amount * (this.state.selectedProduct.units * this.state.selectedProduct.unitSize)).toFixed(2)} KG</b></p>
              </Form.Field>
              : null
            }
            <Form.Field>
              <label>{strings.deliveryDate}</label>
              <DatePicker
                onChange={(date: Date) => {
                  this.handleInputChange("date", date)
                }}
                selected={new Date(this.state.date)}
                dateFormat="dd.MM.yyyy"
                locale="fi"
              />
            </Form.Field>
            <Form.Field style={{ marginTop: 20 }}>
              <label>{"Ajankohta"}</label>
              {this.renderDropDown(deliveryTimeValue, "deliveryTimeValue")}
            </Form.Field>
            <Form.Field style={{ marginTop: 20 }}>
              <label>{strings.deliveryPlace}</label>
              {this.renderDropDown(deliveryPlaceOptions, "selectedPlaceId")}
            </Form.Field>
            {this.state.deliveryNotesWithImageBase64.length > 0  ?
              this.state.deliveryNotesWithImageBase64.map((deliveryNote, i) => {
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
        {this.state.openImage &&
          <Lightbox
            mainSrc={this.state.openImage}
            onCloseRequest={() => this.setState({ openImage: undefined })}
          />
        }
        <DeliveryNoteModal
          modalOpen={this.state.modalOpen}
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
