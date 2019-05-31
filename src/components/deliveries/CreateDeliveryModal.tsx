import * as React from "react";
import * as actions from "../../actions";
import { StoreState, Options, DeliveryDataValue, deliveryNoteImg64 } from "src/types";
import Api, { Product, Delivery, DeliveryNote, Contact, DeliveryPlace } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Dropdown, Form, Input, Button, Divider, Modal, Image } from "semantic-ui-react";
import DeliveryNoteModal from "./DeliveryNoteModal";
import { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "src/localization/strings";
import PriceChart from "../generic/PriceChart";
import * as moment from "moment";
import { FileService } from "src/api/file.service";
import Lightbox from "react-image-lightbox";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  products: Product[],
  date: Date,
  deliveryPlaceId: string,
  onClose: (created?: boolean) => void,
  open: boolean,
  deliveryPlaces: DeliveryPlace[] 
}

/**
 * Interface for component state
 */
interface State {
  selectedProductId?: string;
  selectedContactId?: string;
  selectedDeliveryPlaceId: string,
  amount: number;
  modalOpen: boolean;
  deliveryNotes: DeliveryNote[];
  contacts: Contact[];
  contactsLoading: boolean;
  selectedProduct?: Product;
  deliveryTimeValue?: number;
  deliveryNoteImgs64: deliveryNoteImg64[];
  openImage?: string;
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
      contacts: [],
      deliveryNoteImgs64: [],
      selectedDeliveryPlaceId: props.deliveryPlaceId
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
    if (key === "selectedProductId") {
      const productId = value as string;
      const selectedProduct = this.props.products.find((product) => product.id === productId);
      this.setState({ selectedProduct });
    }
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
    this.getDeliveryNoteImgs(deliveryNotes)
  }

  /**
   * Get delivery note images as base64
   * 
   * @param deliveryNotes deliveryNotes
   */
  private getDeliveryNoteImgs = async (deliveryNotes: DeliveryNote[]) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL) {
      return;
    }
    const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
    const deliveryNotesImages = deliveryNotes.map(async (note) => {
      if (note.image) {
        const imageData = await fileService.getFile(note.image || "");
        const src = `data:image/jpeg;base64,${imageData.data}`
        const deliveryNoteImg64 = { text: note.text, img64: src };
        return deliveryNoteImg64;
      } else {
        const deliveryNoteImg64 = { text: note.text };
        return deliveryNoteImg64;
      }
    })
    const deliveryNoteImgs64 = await Promise.all(deliveryNotesImages.map(note => Promise.resolve(note)));

    this.setState({ deliveryNoteImgs64 });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedProductId || !this.state.selectedContactId) {
      return;
    }
    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    let time: string | Date = moment(this.props.date).format("YYYY-MM-DD");
    time = `${time} ${this.state.deliveryTimeValue}:00 +0000`
    time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();

    const delivery: Delivery = {
      productId: this.state.selectedProductId,
      userId: this.state.selectedContactId,
      time: time,
      status: "PROPOSAL",
      amount: this.state.amount,
      price: "0",
      deliveryPlaceId: this.state.selectedDeliveryPlaceId
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

  private handleSearchChange = async (e: any, { searchQuery }: { searchQuery: string }) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return
    }

    this.setState({ contactsLoading: true });
    const contacts = await Api.getContactsService(this.props.keycloak.token).listContacts(searchQuery);
    this.setState({
      contacts: contacts,
      contactsLoading: false
    });
  }

  /**
   * Remove note
   */
  private removeNote = (note: deliveryNoteImg64, index: number) => {
    const deliveryNoteImgs64 = this.state.deliveryNoteImgs64;
    const newNotesWith64 = deliveryNoteImgs64.filter((note, i) => i !== index);
    const deliveryNotes = this.state.deliveryNotes;
    const newDeliveryNotes = deliveryNotes.filter((note, i) => i !== index);
    this.setState({ deliveryNoteImgs64: newNotesWith64, deliveryNotes: newDeliveryNotes });
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

    const deliveryTimeValue: Options[] = [{
      key: "deliveryTimeValue1",
      text: "Ennen kello 12",
      value: 11
    }, {
      key: "deliveryTimeValue2",
      text: "Jälkeen kello 12",
      value: 17
    }];

    const deliveryPlaces: Options[] = this.props.deliveryPlaces.map((deliveryPlace) => {
      return {
        key: deliveryPlace.id,
        value: deliveryPlace.id,
        text: deliveryPlace.name
      };
    });

    return (
      <Modal onClose={() => this.props.onClose()} open={this.props.open}>
        <Modal.Header>Uusi toimitusehdotus</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field>
              <p><b>Päivämäärä: </b> {this.props.date && moment(this.props.date).format("DD.MM.YYYY")}</p>
            </Form.Field>
            <Form.Field>
              <label>{strings.product}</label>
              { this.renderDropDown(deliveryPlaces, "Toimituspaikka", "selectedDeliveryPlaceId") }
            </Form.Field>
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
            {this.state.amount && this.state.selectedProduct ?
              <Form.Field>
                <p>= <b>{this.state.amount * (this.state.selectedProduct.units * this.state.selectedProduct.unitSize)} KG</b></p>
              </Form.Field>
              : null
            }
            <Form.Field>
              <label>{"Ajankohta"}</label>
              {this.renderDropDown(deliveryTimeValue, "Valitse ajankohta", "deliveryTimeValue")}
            </Form.Field>
            {this.state.deliveryNoteImgs64[0] ?
              this.state.deliveryNoteImgs64.map((deliveryNote, i) => {
                return (
                  <React.Fragment key={`${deliveryNote.text} ${i}`}>
                    <h4 style={{ marginTop: 14 }}>Huomio {i + 1}</h4>
                    <div style={{ marginBottom: 10 }} className="delivery-note-container">
                      <div className="delivery-note-img-container">
                        <p>{deliveryNote.img64 ? <Image onClick={() => this.setState({ openImage: deliveryNote.img64 })} src={deliveryNote.img64} size="small" /> : "Ei kuvaa"}</p>
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
              }) : <Divider />
            }
            <Button color="red" inverted onClick={() => this.setState({ modalOpen: true })}>{`${strings.addNote}`}</Button>
            <Button color="red" floated="right" onClick={this.handleDeliverySubmit} type='submit'>
              Tallenna
            </Button>
          </Form>
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
