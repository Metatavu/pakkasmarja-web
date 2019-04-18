import * as React from "react";
import * as actions from "../../actions/";
import * as _ from "lodash";
import { StoreState, DeliveriesState, DeliveryProduct, Options, DeliveryDataValue } from "../../types";
import Api, { Product, DeliveryPlace, ItemGroupCategory, Delivery, DeliveryNote } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Header, Dropdown, Form, Input, Button } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import { Link } from "react-router-dom";

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
  deliveryPlaces: DeliveryPlace[];
  selectedProductId?: string;
  selectedPlaceId?: string;
  amount: number;
  date: Date;
  modalOpen: boolean;
  category: string;
  redirect: boolean;
  deliveryNotes: DeliveryNote[];
  deliveryId?: string;
  userId: string;
}

/**
 * Class for edit delivery component
 */
class ManageDelivery extends React.Component<Props, State> {

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
      userId: ""
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

    const deliveryId: ItemGroupCategory = this.props.match.params.deliveryId;
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const delivery = await deliveriesService.findDelivery(deliveryId);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const products: Product[] = await productsService.listProducts(undefined, undefined, undefined, undefined, 100);

    this.setState({
      products,
      deliveryPlaces,
      userId: delivery.userId,
      deliveryId,
      amount: delivery.amount,
      selectedProductId: delivery.productId,
      selectedPlaceId: delivery.deliveryPlaceId,
      date: delivery.time
    });
  }

  /**
   * Handle input change
   * 
   * @param key key
   * @param value value
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
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.date || !this.state.deliveryId) {
      return;
    }

    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    const delivery: Delivery = {
      id: "",
      productId: this.state.selectedProductId,
      userId: this.state.userId || "",
      time: this.state.date,
      status: "DONE",
      amount: this.state.amount,
      price: "0",
      quality: "NORMAL",
      deliveryPlaceId: this.state.selectedPlaceId
    }

    const updatedDelivery = await deliveryService.updateDelivery(delivery, this.state.deliveryId);
    const updatedDeliveries = this.getUpdatedDeliveryData(updatedDelivery);
    this.props.deliveriesLoaded && this.props.deliveriesLoaded(updatedDeliveries);

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
    }) || [];

    return (
      <BasicLayout>
        <Header as="h2">
          Hyväksy toimitus
        </Header>
        <Form>
          <Form.Field>
            <label>Tuote</label>
            {this.renderDropDown(productOptions, "selectedProductId")}
          </Form.Field>
          <Form.Field>
            <label>Määrä</label>
            <Input
              placeholder="Määrä"
              value={this.state.amount}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("amount", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>Toimituspäivä</label>
            <DatePicker
              onChange={(date: Date) => {
                this.handleInputChange("date", date)
              }}
              selected={new Date(this.state.date)}
              locale="fi"
            />
          </Form.Field>
          <Form.Field style={{ marginTop: 20 }}>
            <label>Toimituspaikka</label>
            {this.renderDropDown(deliveryPlaceOptions, "selectedPlaceId")}
          </Form.Field>
          <Button.Group floated="right" >
            <Button
              as={Link}
              to={{
                pathname: '/manageIncomingDeliveries'
              }}
              inverted
              color="red">Takaisin</Button>
            <Button.Or text="" />
            <Button color="red" onClick={this.handleDeliverySubmit} type='submit'>Hyväksy toimitus</Button>
          </Button.Group>
        </Form>
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

export default connect(mapStateToProps, mapDispatchToProps)(ManageDelivery);
