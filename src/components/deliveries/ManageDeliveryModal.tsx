import * as React from "react";
import * as actions from "../../actions";
import * as _ from "lodash";
import { StoreState, DeliveriesState, Options, DeliveryDataValue, HttpErrorResponse } from "../../types";
import Api, { Product, DeliveryPlace, Delivery, DeliveryNote, DeliveryQuality } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Dropdown, Form, Input, Button, Modal, Segment } from "semantic-ui-react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "../../localization/strings";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance,
  delivery: Delivery
  open: boolean,
  onError?: (errorMsg: string) => void,
  onClose: () => void
  onUpdate: () => void
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
  category: string,
  deliveryNotes: DeliveryNote[],
  deliveryId?: string,
  userId: string
}

/**
 * Class for edit delivery component
 */
class ManageDeliveryModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      products: [],
      deliveryPlaces: [],
      date: new Date(),
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

    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);

    const delivery = this.props.delivery;
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
      deliveryId: delivery.id,
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
   * Check if object is http error response
   */
  private isHttpErrorResponse(object: any): object is HttpErrorResponse {
    return 'code' in object;
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
  private handleDeliveryAccept = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.date || !this.state.deliveryId) {
      return;
    }

    try {
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      const delivery: Delivery = {
        id: "",
        productId: this.state.selectedProductId,
        userId: this.state.userId || "",
        time: this.state.date,
        status: "DONE",
        amount: this.state.amount,
        price: "0",
        deliveryPlaceId: this.state.selectedPlaceId,
        qualityId: this.state.selectedQualityId
      }
  
      const response = await deliveryService.updateDelivery(delivery, this.state.deliveryId);
      if (this.isHttpErrorResponse(response)) {
        const errorResopnse: HttpErrorResponse = response;
        this.props.onError && this.props.onError(errorResopnse.message);
        return;
      }

      this.props.onUpdate();
    } catch (e) {
      this.props.onError && this.props.onError(strings.errorCommunicatingWithServer);
      this.setState({
        loading: false
      })
    }
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySave = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.date || !this.state.deliveryId) {
      return;
    }

    try {
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      const delivery: Delivery = {
        id: "",
        productId: this.state.selectedProductId,
        userId: this.state.userId || "",
        time: this.state.date,
        status: this.props.delivery.status,
        amount: this.state.amount,
        price: "0",
        deliveryPlaceId: this.state.selectedPlaceId,
        qualityId: this.state.selectedQualityId
      }
  
      const response = await deliveryService.updateDelivery(delivery, this.state.deliveryId);
      if (this.isHttpErrorResponse(response)) {
        const errorResopnse: HttpErrorResponse = response;
        this.props.onError && this.props.onError(errorResopnse.message);
        return;
      }

      this.props.onUpdate();
    } catch (e) {
      this.props.onError && this.props.onError(strings.errorCommunicatingWithServer);
      this.setState({
        loading: false
      })
    }
  }
  
  /**
   * Render method
   */
  public render() {
    if (this.state.loading) {
      return (
        <Modal open={this.props.open}>
          <Modal.Header>Toimituksen hyväksyntä</Modal.Header>
          <Modal.Content>
            <Segment loading />
          </Modal.Content>
        </Modal>
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

    return (
      <Modal onClose={() => this.props.onClose()} open={this.props.open}>
        <Modal.Header>Muokkaa toimitusta</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field>
              Tila: { this.getStatusText() }
            </Form.Field>
            <Form.Field>
              <label>{strings.product}</label>
              {this.renderDropDown(productOptions, "selectedProductId")}
            </Form.Field>
            { this.renderQualityField() }
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
              <label>{strings.deliveryPlace}</label>
              {this.renderDropDown(deliveryPlaceOptions, "selectedPlaceId")}
            </Form.Field>

            { this.renderSubmitButton() }
            
          </Form>
        </Modal.Content>
      </Modal>
    );
  }

  /**
   * Returns status text
   */
  private getStatusText = () => {
    switch (this.props.delivery.status) {
      case "DELIVERY":
        return "Toimituksessa";
      case "DONE":
        return "Hyväksytty";
      case "PLANNED":
        return "Suunnitelma";
      case "PROPOSAL":
        return "Ehdotus";
      case "REJECTED":
        return "Hylätty";
    }
  }

  /**
   * Renders quality field
   */
  private renderQualityField() {
    if (this.props.delivery.status == "PROPOSAL") {
      return null;
    }

    const deliveryQualityOptions = this.state.deliveryQualities.map((deliveryQuality) => {
      return {
        key: deliveryQuality.id,
        text: deliveryQuality.name,
        value: deliveryQuality.id
      };
    });

    return (
      <Form.Field>
        <label>Laatu</label>
        {this.renderDropDown(deliveryQualityOptions, "selectedQualityId")}
      </Form.Field>
    );
  }

  /**
   * Renders submit button
   */
  private renderSubmitButton() {
    if (this.props.delivery.status == "DONE") {
      return <Button disabled color="grey" type='submit'>Toimitus on jo hyväksytty</Button>;
    }

    if (this.props.delivery.status == "REJECTED") {
      return <Button disabled color="grey" type='submit'>Toimitus hylätty</Button>;
    }

    if (this.props.delivery.status == "PROPOSAL") {
      return <Button disabled={ !this.isValid() } color="green" onClick={ this.handleDeliverySave }  type='submit'>Muokkaa ehdotusta</Button>;
    }

    return <Button disabled={ !this.isValid() } color="red" onClick={ this.handleDeliveryAccept } type='submit'>Hyväksy toimitus</Button>;
  }

  /**
   * Returns whether form is valid or not
   * 
   * @return whether form is valid or not
   */
  private isValid = () => {
    if (!this.state.selectedPlaceId) {
      return false;
    }

    if (!this.state.selectedProductId) {
      return false;
    }

    if (this.props.delivery.status != "PROPOSAL" && !this.state.selectedQualityId) {
      return false;
    }

    return true;
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

export default connect(mapStateToProps, mapDispatchToProps)(ManageDeliveryModal);
