import * as React from "react";
import * as actions from "../../actions";
import { StoreState, Options, DeliveryDataValue, DeliveryNoteImage64 } from "src/types";
import Api, { Product, Delivery, DeliveryNote, Contact, DeliveryPlace, DeliveryStatus, DeliveryQuality, ItemGroupCategory, ContractQuantities } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Dropdown, Form, Input, Button, Divider, Modal, Image, Segment } from "semantic-ui-react";
import DeliveryNoteModal from "./DeliveryNoteModal";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "src/localization/strings";
import PriceChart from "../generic/PriceChart";
import * as moment from "moment";
import { FileService } from "src/api/file.service";
import Lightbox from "react-image-lightbox";
import DatePicker, { registerLocale } from "react-datepicker";
import AsyncButton from "../generic/asynchronous-button";
import ApplicationRoles from "src/utils/application-roles";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveryPlaceId: string,
  onClose: (created?: boolean) => void,
  open: boolean,
  deliveryPlaces: DeliveryPlace[],
  selectedDate?: Date,
  category: ItemGroupCategory
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
  deliveryNoteImages64: DeliveryNoteImage64[];
  openImage?: string;
  selectedDeliveryStatus: DeliveryStatus;
  deliveryQualities: DeliveryQuality[];
  selectedQualityId?: string;
  selectedDate: Date;
  redBoxesLoaned: number;
  redBoxesReturned: number;
  grayBoxesLoaned: number;
  grayBoxesReturned: number;
  products: Product[];
  deliveryLoanComment: string;
  contractQuantities?: ContractQuantities[];
  loading: boolean;
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
      deliveryQualities: [],
      amount: 0,
      modalOpen: false,
      deliveryNotes: [],
      contactsLoading: false,
      contacts: [],
      deliveryNoteImages64: [],
      selectedDeliveryPlaceId: props.deliveryPlaceId,
      selectedDeliveryStatus: "PROPOSAL",
      selectedDate: this.props.selectedDate || new Date(),
      redBoxesLoaned: 0,
      redBoxesReturned: 0,
      grayBoxesLoaned: 0,
      grayBoxesReturned: 0,
      products: [],
      deliveryLoanComment: "",
      loading: false
    };

    registerLocale('fi', fi);
  }

  /**
   * Event handler for input change
   *
   * @param key key
   * @param value value
   */
  private handleInputChange = (key: string, value: DeliveryDataValue) => {
    const { products } = this.state;

    this.setState({ ...this.state, [key]: value });

    if (key === "selectedProductId") {
      const productId = value as string;
      const selectedProduct = products.find(product => product.id === productId);
      this.loadDeliveryQualities();
      this.setState({ selectedProduct: selectedProduct });
      this.fetchContractQuantities(selectedProduct);
    }
  }

  /**
   * Event handler for delivery loan comment change
   *
   * @param event change event
   */
  private handleDeliveryLoanCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ deliveryLoanComment: event.target.value });
  }

  /**
   * Load delivery qualities
   */
  private loadDeliveryQualities = async () => {
    const { keycloak, category } = this.props;
    const { selectedProductId } = this.state;

    if (!keycloak || !keycloak.token) {
      return;
    }

    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(keycloak.token);
    const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(category, selectedProductId);

    this.setState({
      deliveryQualities: deliveryQualities,
      selectedQualityId: ""
    });
  }

  /**
   * Render drop down
   *
   * @param options options
   * @param placeholder placeholder
   * @param key key
   */
  private renderDropDown = (options: Options[], placeholder: string, key: string) => {
    if (!options.length) {
      return <Dropdown fluid />;
    }

    const value = this.state[key];

    return (
      <Dropdown
        selection
        fluid
        placeholder={ placeholder }
        value={ value }
        options={ options }
        onChange={ (event, data) => this.handleInputChange(key, data.value) }
      />
    );
  }

  /**
   * Returns whether form is valid or not
   *
   * @return whether form is valid or not
   */
  private isValid = () => {
    const {
      selectedDeliveryStatus,
      selectedDeliveryPlaceId,
      selectedContactId,
      selectedProductId,
      selectedQualityId,
      deliveryTimeValue,
      amount
    } = this.state;

    switch (selectedDeliveryStatus) {
      case "DONE":
        return (
          selectedDeliveryStatus &&
          selectedDeliveryPlaceId &&
          selectedProductId &&
          selectedContactId &&
          selectedQualityId &&
          typeof amount === "number"
        );
      case "DELIVERYLOAN":
        return (
          selectedDeliveryStatus &&
          selectedDeliveryPlaceId &&
          selectedContactId
        );
      default:
        return (
          selectedDeliveryStatus &&
          selectedDeliveryPlaceId &&
          selectedProductId &&
          selectedContactId &&
          deliveryTimeValue &&
          typeof amount === "number"
        );
    }
  }

  /**
   * Add delivery note to state
   *
   * @param deliveryNote deliveryNote
   */
  private addDeliveryNote = (deliveryNote: DeliveryNote) => {
    const deliveryNotes = [ ...this.state.deliveryNotes ];
    deliveryNotes.push(deliveryNote);

    this.setState({ deliveryNotes: deliveryNotes });
    this.getDeliveryNoteImages(deliveryNotes);
  }

  /**
   * Get delivery note images as base64
   *
   * @param deliveryNotes deliveryNotes
   */
  private getDeliveryNoteImages = async (deliveryNotes: DeliveryNote[]) => {
    const { keycloak } = this.props;

    if (!keycloak || !keycloak.token || !process.env.REACT_APP_API_URL) {
      return;
    }

    const fileService = new FileService(process.env.REACT_APP_API_URL, keycloak.token);

    const deliveryNotesImages = deliveryNotes.map(async note => {
      if (note.image) {
        const imageData = await fileService.getFile(note.image || "");
        const src = `data:image/jpeg;base64,${imageData.data}`;
        const deliveryNoteImg64 = { text: note.text, img64: src };
        return deliveryNoteImg64;
      } else {
        const deliveryNoteImg64 = { text: note.text };
        return deliveryNoteImg64;
      }
    })

    const deliveryNoteImages64 = await Promise.all(deliveryNotesImages.map(note => Promise.resolve(note)));

    this.setState({ deliveryNoteImages64: deliveryNoteImages64 });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySubmit = async () => {
    const { keycloak, onClose } = this.props;
    const { selectedDeliveryStatus, selectedProductId, selectedContactId } = this.state;

    if (!keycloak || !keycloak.token || !selectedContactId) {
      return;
    }

    if (selectedProductId && selectedDeliveryStatus !== "DELIVERYLOAN") {
      await this.createDelivery();
    } else {
      await this.createDeliveryLoan();
    }

    onClose(true);
  }

  /**
   * Creates new delivery
   *
   */
  private createDelivery = async() => {
    const { keycloak } = this.props;
    const {
      selectedProductId,
      selectedContactId,
      selectedDeliveryStatus,
      selectedDeliveryPlaceId,
      selectedDate,
      selectedQualityId,
      deliveryTimeValue,
      amount,
      deliveryNotes,
      redBoxesLoaned,
      redBoxesReturned,
      grayBoxesLoaned,
      grayBoxesReturned
    } = this.state;

    if (!keycloak || !keycloak.token || !selectedProductId || !selectedContactId) {
      return;
    }

    const deliveryService = Api.getDeliveriesService(keycloak.token);
    let time: string | Date = moment(selectedDate).format("YYYY-MM-DD");
    time = `${time} ${deliveryTimeValue}:00 +0000`;
    time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();

    const delivery: Delivery = {
      productId: selectedProductId,
      userId: selectedContactId,
      time: time,
      status: selectedDeliveryStatus,
      amount: amount,
      price: "0",
      deliveryPlaceId: selectedDeliveryPlaceId,
      qualityId: undefined,
      loans: []
    }

    if (selectedDeliveryStatus !== "DONE") {
      const createdDelivery = await deliveryService.createDelivery(delivery);
      await Promise.all(deliveryNotes.map(deliveryNote => this.createDeliveryNote(createdDelivery.id || "", deliveryNote)));
    } else {
      delivery.status = "PROPOSAL";
      delivery.time = selectedDate;
      delivery.qualityId = selectedQualityId;
      delivery.loans = [
        { item: "RED_BOX", loaned: redBoxesLoaned, returned: redBoxesReturned },
        { item: "GRAY_BOX", loaned: grayBoxesLoaned, returned: grayBoxesReturned }
      ];

      const createdDelivery = await deliveryService.createDelivery(delivery);
      await Promise.all(deliveryNotes.map(deliveryNote => this.createDeliveryNote(createdDelivery.id!, deliveryNote)));
      await deliveryService.updateDelivery({ ...createdDelivery, status: "DONE" }, createdDelivery.id!);
    }
  }

    /**
   * Creates new delivery
   *
   */
  private createDeliveryLoan = async() => {
    const { keycloak } = this.props;
    const {
      selectedContactId,
      deliveryLoanComment,
      redBoxesLoaned,
      redBoxesReturned,
      grayBoxesLoaned,
      grayBoxesReturned
    } = this.state;

      if (!keycloak || !keycloak.token || !selectedContactId) {
        return;
      }

    try {
      await Api.getDeliveryLoansService(keycloak.token).createDeliveryLoan({
        comment: deliveryLoanComment,
        contactId: selectedContactId,
        loans: [
          { item: "RED_BOX", loaned: redBoxesLoaned, returned: redBoxesReturned },
          { item: "GRAY_BOX", loaned: grayBoxesLoaned, returned: grayBoxesReturned }
        ]
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Fetches contract quantities
   *
   * @param selectedProduct selected product
   */
  private fetchContractQuantities = async (selectedProduct?: Product) => {
    const { keycloak } = this.props;
    const { selectedContactId } = this.state;

    if (
      !keycloak ||
      !keycloak.token ||
      !selectedProduct ||
      !selectedContactId ||
      !keycloak.hasRealmRole(ApplicationRoles.VIEW_CONTRACT_QUANTITIES)
    ) {
      return;
    }

    this.setState({ loading: true });

    const contractQuantities = await Api.getContractsService(keycloak.token).listContractQuantities(
      selectedProduct?.itemGroupId,
      selectedContactId
    );

    this.setState({
      contractQuantities: contractQuantities,
      loading: false
    })
  }

  /**
   * Renders header
   */
  private renderHeader() {
    const { selectedContactId } = this.state;

    return (
      <div className="modal-header">
        <>
          Uusi toimitus/ehdotus
        </>
        { selectedContactId && this.renderContractQuantities() }
      </div>
    )
  }

  /**
   * Renders contract information
   */
  private renderContractQuantities = () => {
    const { contractQuantities, amount, selectedProduct } = this.state;
    const { keycloak } = this.props;

    if (
      !selectedProduct ||
      !contractQuantities?.length ||
      !keycloak?.hasRealmRole(ApplicationRoles.VIEW_CONTRACT_QUANTITIES)
    ) {
      return null;
    }

    var contractQuantity = 0;
    var delivered = 0
    var remainder = 0;

    contractQuantities.forEach(contract => {
      delivered = delivered + (contract.deliveredQuantity || 0);
      contractQuantity = contractQuantity + (contract.contractQuantity || 0);
    })

    remainder = contractQuantity - delivered - (amount * selectedProduct.units * selectedProduct.unitSize);

    return (
      <div className="contract-info">
        <div>
          { strings.contractQuantity }: { contractQuantity }Kg
        </div>
        <div>
          { strings.deliveredQuantity } {delivered }Kg
        </div>
        <div style={{ borderTop: "5px solid #000000 " }}/>
        <div>
        {
          remainder >= 0 ?
            <div>{ strings.contractRemainer }: { remainder }Kg</div> :
            <div style={{ color: "red" }}>{ strings.contractExceeded }: { Math.abs(remainder) }Kg</div>
        }
        </div>
      </div>
    )
  }

  /**
   * Create delivery notes
   *
   * @param deliveryId delivery ID
   * @param deliveryNote delivery note
   */
  private async createDeliveryNote(deliveryId: string, deliveryData: DeliveryNote): Promise<DeliveryNote | null> {
    const { keycloak } = this.props;
    if (keycloak?.token && process.env.REACT_APP_API_URL) {
      return Api.getDeliveriesService(keycloak.token).createDeliveryNote(deliveryData, deliveryId || "");
    }

    return null;
  }

  /**
   * Event handler for search input change
   *
   * @param event change event
   * @param searchData search data
   */
  private handleSearchChange = async (event: any, { searchQuery }: { searchQuery: string }) => {
    const { keycloak } = this.props;

    if (!keycloak?.token) {
      return
    }

    this.setState({ contactsLoading: true });

    this.setState({
      contacts: await Api.getContactsService(keycloak.token).listContacts(searchQuery),
      contactsLoading: false
    });
  }

  /**
   * Remove note
   *
   * @param note note
   * @param index note index
   */
  private removeNote = (note: DeliveryNoteImage64, index: number) => {
    const { deliveryNoteImages64, deliveryNotes } = this.state;
    const newNotesWithImages64 = deliveryNoteImages64.filter((note, i) => i !== index);
    const newDeliveryNotes = deliveryNotes.filter((note, i) => i !== index);

    this.setState({
      deliveryNoteImages64: newNotesWithImages64,
      deliveryNotes: newDeliveryNotes
    });
  }

  /**
   * Renders quality field
   */
  private renderQualityField() {
    const { deliveryQualities } = this.state;

    const deliveryQualityOptions = deliveryQualities.map((deliveryQuality) => ({
      key: deliveryQuality.id,
      text: deliveryQuality.name,
      value: deliveryQuality.id
    }));

    return (
      <Form.Field>
        <label>Laatu</label>
        { !!deliveryQualityOptions.length ?
          this.renderDropDown(deliveryQualityOptions, "Laatu", "selectedQualityId") :
          <p style={{ color: "red" }}>Valitulla tuotteella ei ole laatuluokkia</p>
        }
      </Form.Field>
    );
  }

  /**
   * Get products for contact
   */
  private getProducts = async () => {
    const { keycloak, category } = this.props;
    const { selectedContactId } = this.state;

    if (!keycloak?.token || !selectedContactId) {
      return;
    }

    const productsService = await Api.getProductsService(keycloak.token);
    const unfilteredProducts = await productsService.listProducts(undefined, category, selectedContactId, undefined, 100);
    const products: Product[] = unfilteredProducts.filter(product => product.active === true);
    this.setState({ products });
  }

  /**
   * Render method
   */
  public render() {
    const { deliveryPlaces } = this.props;
    if (this.state.loading) {
      return (
        <Modal open={this.props.open}>
          <Modal.Header>Uusi toimitus/ehdotus</Modal.Header>
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

    const freshDeliveryStatusOptions: Options[] = [{
      key: "proposal",
      text: "Ehdotus",
      value: "PROPOSAL"
    }, {
      key: "done",
      text: "Valmis toimitus",
      value: "DONE"
    }];

    const deliveryPlaceOptions: Options[] = deliveryPlaces
      .filter(deliveryPlace => deliveryPlace.name !== "Muu")
      .map(deliveryPlace => ({
        key: deliveryPlace.id,
        value: deliveryPlace.id,
        text: deliveryPlace.name
      }));

    return (
      <Modal onClose={() => this.props.onClose()} open={this.props.open}>
        <Modal.Header>{ this.renderHeader() }</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field>
              <label>Viljelijä</label>
              <Dropdown
                selection
                search
                options={ contactOptions }
                value={ this.state.selectedContactId }
                placeholder='Valitse viljelijä'
                onChange={(e, data) => this.setState({ selectedContactId: data.value as string }, this.getProducts)}
                onSearchChange={this.handleSearchChange}
                disabled={this.state.contactsLoading}
                loading={this.state.contactsLoading}
              />
            </Form.Field>
            <Form.Field>
              <label>Tila</label>
              {this.renderDropDown(freshDeliveryStatusOptions, "Tila", "selectedDeliveryStatus")}
            </Form.Field>
            <Form.Field>
              <label>Toimituspaikka</label>
              {this.renderDropDown(deliveryPlaceOptions, "Toimituspaikka", "selectedDeliveryPlaceId")}
            </Form.Field>
            <Form.Field>
              {this.state.selectedProductId && this.props.category === "FRESH" &&
                <PriceChart showLatestPrice time={this.state.selectedDate} productId={this.state.selectedProductId} />
              }
            </Form.Field>
            { this.state.selectedDeliveryStatus !== "DELIVERYLOAN" &&
              <Form.Field>
                <label>{strings.product}</label>
                {productOptions.length > 0 ? this.renderDropDown(productOptions, strings.product, "selectedProductId") : this.state.selectedContactId ? <p style={{ color: "red" }}>Viljelijällä ei ole voimassa olevaa sopimusta</p> : <p style={{ color: "red" }}>Valitse viljelijä</p>}
              </Form.Field>
            }
            {this.state.selectedDeliveryStatus !== "PROPOSAL" ?
              <Form.Field>
                <label>{strings.deliveryDate}</label>
                <DatePicker
                  onChange={(date: Date) => {
                    this.setState({ selectedDate: date })
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  timeCaption="aika"
                  selected={new Date(this.state.selectedDate)}
                  dateFormat="dd.MM.yyyy HH:mm"
                  locale="fi"
                />
              </Form.Field>
              :
              <React.Fragment>
                <Form.Field>
                  <label>{strings.deliveryDate}</label>
                  <DatePicker
                    onChange={(date: Date) => {
                      this.setState({ selectedDate: date })
                    }}
                    selected={new Date(this.state.selectedDate)}
                    dateFormat="dd.MM.yyyy"
                    locale="fi"
                  />
                </Form.Field>
                <Form.Field>
                  <label>{"Ajankohta"}</label>
                  {this.renderDropDown(deliveryTimeValue, "Valitse ajankohta", "deliveryTimeValue")}
                </Form.Field>
              </React.Fragment>
            }
            {this.state.selectedDeliveryStatus === "DONE" && this.state.selectedProduct &&
              <Form.Field>
                {this.renderQualityField()}
              </Form.Field>
            }
            { this.state.selectedDeliveryStatus !== "DELIVERYLOAN" &&
                <Form.Field>
                  <label>{`${strings.amount} ${this.state.selectedProduct ? `(${this.state.selectedProduct.unitName})` : ""}`}</label>
                  <Input
                    placeholder={strings.amount}
                    value={this.state.amount}
                    type="number"
                    min={0}
                    onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                      const value = event.currentTarget.value ? parseInt(event.currentTarget.value) : "";
                      this.handleInputChange("amount", value);
                    }}
                  />
                </Form.Field>
            }
            {this.props.category === "FRESH" && this.state.amount && this.state.selectedProduct ?
              <Form.Field>
                <p>= <b>{this.state.amount * this.state.selectedProduct.units * this.state.selectedProduct.unitSize} KG</b></p>
              </Form.Field>
              : null
            }
            {
              this.state.selectedDeliveryStatus === "DONE" && this.props.category === "FROZEN" &&
              <React.Fragment>
                <Form.Field>
                  <label>{strings.redBoxesReturned}</label>
                  <Input
                    type="number"
                    placeholder="Palautettu"
                    value={this.state.redBoxesReturned}
                    onChange={(e, data) => {
                      this.setState({
                        redBoxesReturned: parseInt(data.value)
                      })
                    }} />
                </Form.Field>
                <Form.Field>
                  <label>{strings.redBoxesLoaned}</label>
                  <Input
                    type="number"
                    placeholder="Lainattu"
                    value={this.state.redBoxesLoaned}
                    onChange={(e, data) => {
                      this.setState({
                        redBoxesLoaned: parseInt(data.value)
                      })
                    }} />
                </Form.Field>
                <Form.Field>
                  <label>{strings.grayBoxesReturned}</label>
                  <Input
                    type="number"
                    placeholder="Palautettu"
                    value={this.state.grayBoxesReturned}
                    onChange={(e, data) => {
                      this.setState({
                        grayBoxesReturned: parseInt(data.value)
                      })
                    }} />
                </Form.Field>
                <Form.Field>
                  <label>{strings.grayBoxesLoaned}</label>
                  <Input
                    type="number"
                    placeholder="Lainattu"
                    value={this.state.grayBoxesLoaned}
                    onChange={(e, data) => {
                      this.setState({
                        grayBoxesLoaned: parseInt(data.value)
                      })
                    }} />
                </Form.Field>
              </React.Fragment>
            }
            {
              this.state.selectedDeliveryStatus === "DELIVERYLOAN" && this.props.category === "FROZEN" &&
              <React.Fragment>
                <Form.Field>
                  <label>{strings.redBoxesReturned}</label>
                  <Input
                    type="number"
                    placeholder="Palautettu"
                    value={this.state.redBoxesReturned}
                    onChange={(e, data) => {
                      this.setState({
                        redBoxesReturned: parseInt(data.value)
                      })
                    }} />
                </Form.Field>
                <Form.Field>
                  <label>{strings.redBoxesLoaned}</label>
                  <Input
                    type="number"
                    placeholder="Lainattu"
                    value={this.state.redBoxesLoaned}
                    onChange={(e, data) => {
                      this.setState({
                        redBoxesLoaned: parseInt(data.value)
                      })
                    }} />
                </Form.Field>
                <Form.Field>
                  <label>{strings.grayBoxesReturned}</label>
                  <Input
                    type="number"
                    placeholder="Palautettu"
                    value={this.state.grayBoxesReturned}
                    onChange={(e, data) => {
                      this.setState({
                        grayBoxesReturned: parseInt(data.value)
                      })
                    }} />
                </Form.Field>
                <Form.Field>
                  <label>{strings.grayBoxesLoaned}</label>
                  <Input
                    type="number"
                    placeholder="Lainattu"
                    value={this.state.grayBoxesLoaned}
                    onChange={(e, data) => {
                      this.setState({
                        grayBoxesLoaned: parseInt(data.value)
                      })
                    }} />
                </Form.Field>
                <Form.Field>
                  <label>Kommentti</label>
                  <Input
                    type="string"
                    placeholder="Kommentti"
                    onChange={ this.handleDeliveryLoanCommentChange }
                    value={ this.state.deliveryLoanComment || ""}
                  />
                </Form.Field>
              </React.Fragment>
            }
            {this.state.deliveryNoteImages64[0] ?
              this.state.deliveryNoteImages64.map((deliveryNote, i) => {
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
            { this.state.selectedDeliveryStatus !== "DELIVERYLOAN" &&
              <Button color="red" inverted onClick={() => this.setState({ modalOpen: true })}>{`${strings.addNote}`}</Button>
            }
            <AsyncButton color="red" disabled={ !this.isValid() } floated="right" onClick={ this.handleDeliverySubmit } type='submit'>
              Tallenna
            </AsyncButton>
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
