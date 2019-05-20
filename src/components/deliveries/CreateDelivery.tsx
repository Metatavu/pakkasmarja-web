import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, DeliveryProduct, Options, DeliveryDataValue } from "src/types";
import Api, { Product, DeliveryPlace, ItemGroupCategory, Delivery, DeliveryNote } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Header, Dropdown, Form, Input, Button, Divider } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
import DeliveryNoteModal from "./DeliveryNoteModal";
import { Redirect } from "react-router";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import { Link } from "react-router-dom";
import strings from "src/localization/strings";

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
  selectedProductId: string;
  selectedPlaceId: string;
  amount: number;
  date: Date;
  modalOpen: boolean;
  category: string;
  redirect: boolean;
  deliveryNotes: DeliveryNote[];
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
      selectedProductId: "",
      selectedPlaceId: "",
      amount: 0,
      date: new Date(),
      modalOpen: false,
      category: "",
      deliveryNotes: []
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
    const category: ItemGroupCategory = this.props.match.params.category;
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const products: Product[] = await productsService.listProducts(undefined, category, undefined, undefined, 100);

    this.setState({
      products,
      deliveryPlaces,
      category
    });
  }

  /**
   * Handle inputchange
   */
  private handleInputChange = (key: string, value: DeliveryDataValue) => {
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
  private addDeliveryNote = (deliveryNote: DeliveryNote) => {
    const deliveryNotes: DeliveryNote[] = this.state.deliveryNotes || [];
    deliveryNotes.push(deliveryNote);
    this.setState({ deliveryNotes });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.date) {
      return;
    }
    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);

    const delivery: Delivery = {
      id: "",
      productId: this.state.selectedProductId,
      userId: this.props.keycloak.subject || "",
      time: this.state.date,
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
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to={{
        pathname: '/deliveries',
        state: { activeItem: 'incomingDeliveries' }
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

    return (
      <BasicLayout>
        <Header as="h2">
          Uusi {this.state.category === "FRESH" ? "tuore" : "pakaste"} toimitus
        </Header>
        <Form>
          <Form.Field>
            <label>{strings.product}</label>
            {this.renderDropDown(productOptions, strings.product, "selectedProductId")}
          </Form.Field>
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
              selected={this.state.date}
              locale="fi"
            />
          </Form.Field>
          <Form.Field style={{ marginTop: 20 }}>
            <label>{strings.deliveryPlace}</label>
            {this.renderDropDown(deliveryPlaceOptions, strings.deliveryPlace, "selectedPlaceId")}
          </Form.Field>
          <Button color="red" inverted onClick={() => this.setState({ modalOpen: true })}>{`${strings.addNote} (${this.state.deliveryNotes.length})`}</Button>
          <Divider />
          <Button.Group floated="right" >
            <Button
              as={Link}
              to={{
                pathname: '/deliveries',
                state: { activeItem: 'incomingDeliveries' }
              }}
              inverted
              color="red">{strings.back}</Button>
            <Button.Or text="" />
            <Button color="red" onClick={this.handleDeliverySubmit} type='submit'>
              {this.state.category === "FRESH" ? strings.newFreshDelivery : strings.newFrozenDelivery}
            </Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateDelivery);
