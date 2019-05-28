import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, Options, DeliveryDataValue, deliveryNoteImg64 } from "src/types";
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
import fi from 'date-fns/esm/locale/fi';
import strings from "src/localization/strings";
import * as moment from "moment";
import PriceChart from "../generic/PriceChart";
import { FileService } from "src/api/file.service";
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';

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
  deliveryNotesWithImgBase64: deliveryNoteImg64[];
  deliveryTimeValue?: number;
  openImage?: string;
  loading: boolean;
  selectedProduct?: Product;
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
      date: new Date(),
      modalOpen: false,
      category: "",
      deliveryNotes: [],
      deliveryNotesWithImgBase64: [],
      loading: false
    };
    registerLocale('fi', fi);
  }

  /**
   * Component did mount life-cycle event
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
    const products: Product[] = await productsService.listProducts(undefined, category, undefined, undefined, 100);

    this.setState({
      products,
      deliveryPlaces,
      category,
      loading: false
    });
  }

  /**
   * Handle inputchange
   */
  private handleInputChange = (key: string, value: DeliveryDataValue) => {
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
   * Add delivery note to state
   * 
   * @param deliveryNote deliveryNote
   */
  private addDeliveryNote = async (deliveryNote: DeliveryNote) => {
    if (!process.env.REACT_APP_API_URL || !this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const deliveryNotesWithImgBase64 = this.state.deliveryNotesWithImgBase64;
    if (deliveryNote.image) {
      const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
      const imageData = await fileService.getFile(deliveryNote.image || "");
      const src = `data:image/jpeg;base64,${imageData.data}`
      deliveryNotesWithImgBase64.push({ text: deliveryNote.text, img64: src });
    } else {
      deliveryNotesWithImgBase64.push({ text: deliveryNote.text, img64: "" });
    }

    const deliveryNotes: DeliveryNote[] = this.state.deliveryNotes || [];
    deliveryNotes.push(deliveryNote);
    this.setState({ deliveryNotes, deliveryNotesWithImgBase64 });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.date) {
      return;
    }
    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    let time: string | Date = moment(this.state.date).format("YYYY-MM-DD");
    time = `${time} ${this.state.deliveryTimeValue}:00 +0000`
    time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();

    const delivery: Delivery = {
      productId: this.state.selectedProductId,
      userId: this.props.keycloak.subject || "",
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
   * @param deliveryNote deliveryNote
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
   */
  private removeNote = (note: deliveryNoteImg64, index: number) => {
    const deliveryNotesWithImgBase64 = this.state.deliveryNotesWithImgBase64;
    const newNotesWith64 = deliveryNotesWithImgBase64.filter((note, i) => i !== index);
    const deliveryNotes = this.state.deliveryNotes;
    const newDeliveryNotes = deliveryNotes.filter((note, i) => i !== index);
    this.setState({ deliveryNotesWithImgBase64: newNotesWith64, deliveryNotes: newDeliveryNotes });
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
    });

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
      <BasicLayout pageTitle={"Uusi toimitus"}>
        <Header as="h2">
          Uusi {this.state.category === "FRESH" ? "tuore" : "pakaste"} toimitus
        </Header>
        {this.state.loading ?
          <Loader size="medium" content={strings.loading} active /> :
          <Form>
            <Form.Field>
              <label>{strings.product}</label>
              {this.renderDropDown(productOptions, strings.product, "selectedProductId")}
            </Form.Field>
            {this.state.selectedProductId &&
              <Form.Field>
                <PriceChart showLatestPrice productId={this.state.selectedProductId} />
              </Form.Field>
            }
            <Form.Field>
              <label>{`${strings.amount} ( ${this.state.selectedProduct && this.state.selectedProduct.unitName || "Tuotetta ei ole valittu"} )`}</label>
              <Input
                placeholder={strings.amount}
                value={this.state.amount}
                onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                  this.handleInputChange("amount", event.currentTarget.value)
                }}
              />
            </Form.Field>
            {this.state.amount && this.state.selectedProduct ?
              <Form.Field>
                <p>= <b>{this.state.amount * (this.state.selectedProduct.units * this.state.selectedProduct.unitSize)} KG</b></p>
              </Form.Field>
              : null
            }
            <Form.Field>
              <label>{strings.deliveyDate}</label>
              <DatePicker
                onChange={(date: Date) => {
                  this.handleInputChange("date", date)
                }}
                selected={this.state.date}
                locale="fi"
              />
            </Form.Field>
            <Form.Field style={{ marginTop: 20 }}>
              <label>{"Ajankohta"}</label>
              {this.renderDropDown(deliveryTimeValue, "Valitse ajankohta", "deliveryTimeValue")}
            </Form.Field>
            <Form.Field style={{ marginTop: 20 }}>
              <label>{strings.deliveryPlace}</label>
              {this.renderDropDown(deliveryPlaceOptions, strings.deliveryPlace, "selectedPlaceId")}
            </Form.Field>
            {this.state.deliveryNotesWithImgBase64[0] ?
              this.state.deliveryNotesWithImgBase64.map((deliveryNote, i) => {
                return (
                  <React.Fragment key={`${deliveryNote.text} ${i}`}>
                    <h4 style={{ marginTop: 14 }}>Huomio {i + 1}</h4>
                    <div style={{ marginBottom: 10 }} className="delivery-note-container">
                      <div className="delivery-note-img-container">
                        <p>{deliveryNote.img64 ? <Image onClick={() => this.setState({ openImage: deliveryNote.img64 })} src={deliveryNote.img64} size="small" /> : "Huomiolla ei ole kuvaa"}</p>
                      </div>
                      <div className="delivery-note-text-container">
                        <p style={{ padding: 20 }}> {deliveryNote.text}</p>
                      </div>
                      <div style={{ display: "flex", flex: 0.2, minHeight: "100px", alignItems: "center" }}>
                        <Button onClick={() => this.removeNote(deliveryNote, i)} color="black">Poista huomio</Button>
                      </div>
                    </div>
                  </React.Fragment>
                )
              }) : null
            }
            <Button color="red" inverted onClick={() => this.setState({ modalOpen: true })}>{`${strings.addNote}`}</Button>
            <Divider />
            <Button.Group floated="right" >
              <Button
                onClick={() => this.setState({ redirect: true })}
                inverted
                color="red">{strings.back}</Button>
              <Button.Or text="" />
              <Button color="red" onClick={this.handleDeliverySubmit} type='submit'>
                {this.state.category === "FRESH" ? strings.newFreshDelivery : strings.newFrozenDelivery}
              </Button>
            </Button.Group>
          </Form>
        }
        <DeliveryNoteModal
          modalOpen={this.state.modalOpen}
          closeModal={() => this.setState({ modalOpen: false })}
          addDeliveryNote={this.addDeliveryNote}
        />
        {this.state.openImage &&
          <Lightbox
            mainSrc={this.state.openImage}
            onCloseRequest={() => this.setState({ openImage: undefined })}
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
