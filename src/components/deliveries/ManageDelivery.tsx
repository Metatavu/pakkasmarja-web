import * as React from "react";
import * as actions from "../../actions/";
import * as _ from "lodash";
import { StoreState, DeliveriesState, Options, DeliveryDataValue } from "../../types";
import Api, { Product, DeliveryPlace, ItemGroupCategory, Delivery, DeliveryNote, DeliveryQuality } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Header, Dropdown, Form, Input, Button, Dimmer, Loader } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
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
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance,
  match?: any
}

/**
 * Interface for component state
 */
interface State {
  loading: boolean,
  products: Product[],
  deliveryPlaces: DeliveryPlace[],
  deliveryQualities: DeliveryQuality[],
  selectedProductId?: string,
  selectedPlaceId?: string,
  selectedQualityId?: string,
  amount: number,
  date: Date,
  modalOpen: boolean,
  category: string,
  redirect: boolean,
  deliveryNotes: DeliveryNote[],
  deliveryId?: string,
  userId: string
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
      loading: false,
      redirect: false,
      products: [],
      deliveryPlaces: [],
      date: new Date(),
      modalOpen: false,
      category: "",
      deliveryNotes: [],
      amount: 0,
      userId: "",
      deliveryQualities: []
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

    this.setState({
      loading: true
    });

    const deliveryId: ItemGroupCategory = this.props.match.params.deliveryId;
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);

    const delivery = await deliveriesService.findDelivery(deliveryId);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const products: Product[] = await productsService.listProducts(undefined, undefined, undefined, undefined, 100);
    const deliveryProduct = products.find((product) => {
      return product.id == delivery.productId;
    });

    if (!deliveryProduct) {
      throw new Error("Could not find delivery product");
    }
    
    const itemGroup = await itemGroupsService.findItemGroup(deliveryProduct.itemGroupId);
    if (!itemGroup) {
      throw new Error("Could not find item group");
    }

    const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(itemGroup.category);

    this.setState({
      products,
      deliveryPlaces,
      userId: delivery.userId,
      deliveryId,
      amount: delivery.amount,
      selectedProductId: delivery.productId,
      selectedPlaceId: delivery.deliveryPlaceId,
      selectedQualityId: delivery.qualityId,
      date: delivery.time,
      deliveryQualities: deliveryQualities,
      loading: false
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
        placeholder={"Valitse"}
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

    const amount =  Number(Number(this.state.amount).toFixed(3));
    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    const delivery: Delivery = {
      id: "",
      productId: this.state.selectedProductId,
      userId: this.state.userId || "",
      time: this.state.date,
      status: "DONE",
      amount: amount,
      price: "0",
      deliveryPlaceId: this.state.selectedPlaceId,
      qualityId: this.state.selectedQualityId
    }

    await deliveryService.updateDelivery(delivery, this.state.deliveryId);

    this.setState({ redirect: true });
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
    
    if (this.state.loading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted> Lataa... </Loader>
          </Dimmer>
        </BasicLayout>
      );
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

    const deliveryQualityOptions = this.state.deliveryQualities.map((deliveryQuality) => {
      return {
        key: deliveryQuality.id,
        text: deliveryQuality.name,
        value: deliveryQuality.id
      };
    });

    return (
      <BasicLayout>
        <Header as="h2">
          {strings.approveDelivery}
        </Header>
        <Form>
          <Form.Field>
            <label>{strings.product}</label>
            {this.renderDropDown(productOptions, "selectedProductId")}
          </Form.Field>
          <Form.Field>
            <label>Laatu</label>
            {this.renderDropDown(deliveryQualityOptions, "selectedQualityId")}
          </Form.Field>
          <Form.Field>
            <label>Määrä</label>
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
              dateFormat="dd.MM.yyyy"
              locale="fi"
            />
          </Form.Field>
          <Form.Field style={{ marginTop: 20 }}>
            <label>{strings.deliveryPlace}</label>
            {this.renderDropDown(deliveryPlaceOptions, "selectedPlaceId")}
          </Form.Field>
          <Button.Group floated="right" >
            <Button
              as={Link}
              to={{
                pathname: '/manageIncomingDeliveries'
              }}
              inverted
              color="red">{strings.back}</Button>
            <Button.Or text="" />
            <Button disabled={ !this.isValid() } color="red" onClick={this.handleDeliverySubmit} type='submit'>Hyväksy toimitus</Button>
          </Button.Group>
        </Form>
      </BasicLayout>
    );
  }

  /**
   * Returns whether form is valid or not
   * 
   * @return whether form is valid or not
   */
  private isValid = () => {
    return !!(this.state.selectedPlaceId && this.state.selectedProductId && this.state.selectedQualityId);
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
