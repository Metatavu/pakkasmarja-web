import * as React from "react";
import * as actions from "../../actions/";
import * as _ from "lodash";
import { StoreState, DeliveriesState, DeliveryProduct, Options, DeliveryDataValue } from "src/types";
import Api, { Product, DeliveryPlace, ItemGroupCategory, Delivery, DeliveryNote, ProductPrice } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Header, Dropdown, Form, Input, Button, Divider, Icon } from "semantic-ui-react";
import "../../styles/common.css";
import BasicLayout from "../generic/BasicLayout";
import DeliveryNoteModal from "./DeliveryNoteModal";
import { Redirect } from "react-router";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "src/localization/strings";
import * as moment from "moment";

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
  time?: Date;
  modalOpen: boolean;
  category: string;
  redirect: boolean;
  deliveryNotes: DeliveryNote[];
  deliveryId?: string;
  deliveryTimeValue: number;
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
      amount: 0,
      deliveryTimeValue: 11
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

    const category: ItemGroupCategory = this.props.match.params.category;
    const deliveryId: ItemGroupCategory = this.props.match.params.deliveryId;
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const delivery = await deliveriesService.findDelivery(deliveryId);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const products: Product[] = await productsService.listProducts(undefined, category, undefined, undefined, 100);
    const productPricesService = await Api.getProductPricesService(this.props.keycloak.token);
    const productPriceList = await productPricesService.listProductPrices(delivery.productId, "CREATED_AT_DESC", 0, 1);
    const productPrice = productPriceList[0];
    const deliveryTimeValue = Number(moment(delivery.time).utc().format("HH"));

    this.setState({
      products,
      productPrice,
      deliveryPlaces,
      category,
      deliveryId,
      amount: delivery.amount,
      selectedProductId: delivery.productId,
      selectedPlaceId: delivery.deliveryPlaceId,
      date: delivery.time,
      deliveryTimeValue
    });
  }

  /**
   * Handle input change
   * 
   * @param key key
   * @param value value
   */
  private handleInputChange = async (key: string, value: DeliveryDataValue) => {
    if (key === "selectedProductId") {
      if (!this.props.keycloak || !this.props.keycloak.token || !value) {
        return;
      }
      const productPricesService = await Api.getProductPricesService(this.props.keycloak.token);
      const productPriceList = await productPricesService.listProductPrices(value.toString(), "CREATED_AT_DESC", 0, 1);
      const productPrice = productPriceList[0];
      this.setState({ productPrice });
    } else if (key === "deliveryTimeValue") {
      let time: string | Date = moment(this.state.date).format("YYYY-MM-DD");
      time = `${time} ${value}:00 +0000`
      time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();
      this.setState({ time });
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
  private addDeliveryNote = (deliveryNote: DeliveryNote) => {
    const deliveryNotes: DeliveryNote[] = this.state.deliveryNotes || [];
    deliveryNotes.push(deliveryNote);
    this.setState({ deliveryNotes });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.keycloak.subject || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.time || !this.state.deliveryId) {
      return;
    }

    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    const delivery: Delivery = {
      id: this.state.deliveryId,
      productId: this.state.selectedProductId,
      userId: this.props.keycloak.subject,
      time: this.state.time,
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
    if (this.props.keycloak && this.props.keycloak.token && process.env.REACT_APP_API_URL) {
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      return deliveryService.createDeliveryNote(deliveryData, deliveryId || "");
    }

    return null;
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
      text: "Ennen kello 11",
      value: 11
    }, {
      key: "deliveryTimeValue2",
      text: "Jälkeen kello 11",
      value: 17
    }]


    return (
      <BasicLayout>
        <Header as="h2">
          {strings.editDelivery}
        </Header>
        <Form>
          <Form.Field>
            <label>{strings.product}</label>
            {this.renderDropDown(productOptions, "selectedProductId")}
          </Form.Field>
          {this.state.productPrice &&
            <Form.Field>
              <p><Icon name="info circle" size="large" color="red" />Tämän hetkinen hinta on {this.state.productPrice.price} {this.state.productPrice.unit}</p>
            </Form.Field>
          }
          <Form.Field>
            <label>{strings.amount}</label>
            <Input
              placeholder={strings.amount}
              value={this.state.amount}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("amount", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>{strings.deliveyDate}</label>
            <DatePicker
              onChange={(date: Date) => {
                this.handleInputChange("date", date)
              }}
              selected={new Date(this.state.date)}
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
          <Button color="red" inverted onClick={() => this.setState({ modalOpen: true })}>{strings.addNote} {`(${this.state.deliveryNotes.length})`}</Button>
          <Divider />
          <Button.Group floated="right" >
            <Button
              onClick={() => this.setState({ redirect: true })}
              inverted
              color="red">{strings.back}</Button>
            <Button.Or text="" />
            <Button color="red" onClick={this.handleDeliverySubmit} type='submit'>{strings.save}</Button>
          </Button.Group>
        </Form>
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
