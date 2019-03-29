import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState } from "src/types";
import Api, { Product, DeliveryPlace } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Header, Dropdown, Form, Input } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
import DatePicker from 'react-date-picker';
import DeliveryNoteModal from "./DeliveryNoteModal";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveries?: DeliveriesState;
}

/**
 * Interface for component state
 */
interface State {
  products: Product[];
  deliveryPlaces: DeliveryPlace[],
  selectedProductId: string;
  selectedPlaceId: string;
  amount: number;
  date: Date;
  modalOpen: boolean;
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
      products: [],
      deliveryPlaces: [],
      selectedProductId: "",
      selectedPlaceId: "",
      amount: 0,
      date: new Date(),
      modalOpen: false
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const products: Product[] = await productsService.listProducts();

    this.setState({
      products,
      deliveryPlaces,
    });
  }

  /**
   * Handle inputchange
   */
  private handleInputChange = (key: string, value: any) => {
    const state = this.state;
    state[key] = value;

    this.setState(state);
  }

  /**
   * Render drop down
   * 
   * @param options options
   */
  private renderDropDown = (options: any, placeholder: string, key: string) => {
    console.log(options);
    if (options.length <= 0) {
      return <Dropdown fluid/>;
    }

    return (
      <Dropdown
        fluid
        placeholder={placeholder}
        value={this.state.selectedPlaceId}
        options={options}
        onChange={(event, data) => {
          this.handleInputChange(key, data.value)
        }
        }
      />
    );
  }

  /**
   * Render method
   */
  public render() {
    const productOptions = this.state.products.map((product) => {
      return {
        key: product.id,
        text: product.name,
        value:product.id
      };
    });

    const deliveryPalceOptions = this.state.deliveryPlaces && this.state.deliveryPlaces.map((deliveryPlace) => {
      return {
        key: deliveryPlace.id || "",
        text: deliveryPlace.name || "",
        value: deliveryPlace.id || ""
      };
    }) || [];

    return (
      <BasicLayout>
        <Header as="h2">
          Uusi toimitus
        </Header>
        <Form>
          <Form.Field>
            <label>Tuote</label>
            {this.renderDropDown(productOptions, "Valitse tuote", "selectedProductId")}
          </Form.Field>
          <Form.Field>
            <label>Määrä</label>
            <Input
              placeholder="Määrä"
              value={this.state.amount}
              onChange={(event: any) => {
                this.handleInputChange("amount", event.target.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>Toimituspäivä</label>
            <DatePicker
              onChange={(date: Date) => {
                this.handleInputChange("date", date)
              }}
              value={this.state.date}
            />
          </Form.Field>
          <Form.Field style={{marginTop: 20}}>
            <label>Toimituspaikka</label>
            {this.renderDropDown(deliveryPalceOptions, "Valitse toimituspaikka", "selectedPlaceId")}
          </Form.Field>
          <p onClick={() => this.setState({ modalOpen: true })}>Lisää huomio</p>
        </Form>
        <DeliveryNoteModal 
          modalOpen={this.state.modalOpen}
          onNoteChange={(text:string, value:any) => console.log("Hai")}
          note="Moi"
          closeModal={() => this.setState({modalOpen: false})}
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
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateDelivery);