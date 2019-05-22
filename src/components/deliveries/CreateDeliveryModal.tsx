import * as React from "react";
import * as actions from "../../actions";
import { StoreState, Options, DeliveryDataValue } from "src/types";
import Api, { Product, Delivery, DeliveryNote, Contact } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Dropdown, Form, Input, Button, Divider, Modal } from "semantic-ui-react";
import DeliveryNoteModal from "./DeliveryNoteModal";
import { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "src/localization/strings";
import PriceChart from "../generic/PriceChart";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  products: Product[],
  date: Date,
  deliveryPlaceId: string
  onClose: (created?: boolean) => void,
  open: boolean
}

/**
 * Interface for component state
 */
interface State {
  selectedProductId?: string;
  selectedContactId?: string;
  amount: number;
  modalOpen: boolean;
  deliveryNotes: DeliveryNote[];
  contacts: Contact[]
  contactsLoading: boolean
}

/**
 * Class for create delivery component
 */
class CreateDeliveryModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      amount: 0,
      modalOpen: false,
      deliveryNotes: [],
      contactsLoading: false,
      contacts: []
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
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedProductId || !this.state.selectedContactId) {
      return;
    }
    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);

    const delivery: Delivery = {
      id: "",
      productId: this.state.selectedProductId,
      userId: this.state.selectedContactId,
      time: this.props.date,
      status: "PLANNED",
      amount: this.state.amount,
      price: "0",
      deliveryPlaceId: this.props.deliveryPlaceId
    }

    const createdDelivery = await deliveryService.createDelivery(delivery);
    await Promise.all(this.state.deliveryNotes.map((deliveryNote): Promise<DeliveryNote | null> => {
      return this.createDeliveryNote(createdDelivery.id || "", deliveryNote);
    }));

    this.props.onClose(true);
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

  private handleSearchChange = async (e: any, { searchQuery } : { searchQuery: string }) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return
    }

    this.setState({contactsLoading: true});
    const contacts = await Api.getContactsService(this.props.keycloak.token).listContacts(searchQuery);
    this.setState({
      contacts: contacts,
      contactsLoading: false
    });
  }

  /**
   * Render method
   */
  public render() {
    const productOptions: Options[] = this.props.products.map((product) => {
      return {
        key: product.id,
        text: product.name,
        value: product.id
      };
    });

    const contactOptions: Options[] = this.state.contacts.map((contact) => {
      return {
        key: contact.id,
        text: contact.displayName,
        value: contact.id
      };
    });

    return (
      <Modal onClose={() => this.props.onClose()} open={this.props.open}>
        <Modal.Header>Uusi toimitusehdotus</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field>
              <label>{strings.product}</label>
              {this.renderDropDown(productOptions, strings.product, "selectedProductId")}
            </Form.Field>
            <Form.Field>
              {this.state.selectedProductId && 
                <PriceChart showLatestPrice productId={this.state.selectedProductId} />
              }
            </Form.Field>
            <Form.Field>
              <label>Viljelijä</label>
              <Dropdown
                selection
                search={true}
                options={contactOptions}
                value={this.state.selectedContactId}
                placeholder='Valitse viljelijä'
                onChange={(e, data) => this.setState({ selectedContactId: data.value as string })}
                onSearchChange={this.handleSearchChange}
                disabled={this.state.contactsLoading}
                loading={this.state.contactsLoading}
              />
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
            <Button color="red" inverted onClick={() => this.setState({ modalOpen: true })}>{`${strings.addNote} (${this.state.deliveryNotes.length})`}</Button>
            <Divider />
            <Button color="red" onClick={this.handleDeliverySubmit} type='submit'>
              Tallenna
            </Button>
          </Form>
          <DeliveryNoteModal
            modalOpen={this.state.modalOpen}
            closeModal={() => this.setState({ modalOpen: false })}
            addDeliveryNote={this.addDeliveryNote}
          />
      </Modal.Content>
    </Modal>
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
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {};
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateDeliveryModal);
