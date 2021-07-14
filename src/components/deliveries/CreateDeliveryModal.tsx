import * as React from "react";
import * as actions from "../../actions";
import { StoreState, Options, DeliveryDataValue, deliveryNoteImg64 } from "src/types";
import Api, { Product, Delivery, DeliveryNote, Contact, DeliveryPlace, DeliveryStatus, DeliveryQuality, ItemGroupCategory, ContractQuantities, Body1 } from "pakkasmarja-client";
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
  deliveryNoteImgs64: deliveryNoteImg64[];
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
      deliveryNoteImgs64: [],
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
   * Handle inputchange
   */
  private handleInputChange = (key: string, value: DeliveryDataValue) => {

    const state: State = this.state;
    state[key] = value;
    this.setState(state);
    if (key === "selectedProductId") {
      const productId = value as string;
      const selectedProduct = this.state.products.find((product) => product.id === productId);
      this.loadDeliveryQualities();
      this.setState({ selectedProduct });
      this.fetchContractQuantities(selectedProduct);
    }
  }

  /**
   * Handle delivery loan comment change
   */
  private handleDeliveryLoanCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      deliveryLoanComment: event.target.value
    })
  }

  /**
   * Load delivery qualities
   */
  private loadDeliveryQualities = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(this.props.category, this.state.selectedProductId);
    this.setState({ deliveryQualities, selectedQualityId: "" });
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
   * Returns whether form is valid or not
   * 
   * @return whether form is valid or not
   */
  private isValid = () => {
    if (this.state.selectedDeliveryStatus === "DONE") {
      return !!(
        this.state.selectedDeliveryStatus
        && this.state.selectedDeliveryPlaceId
        && this.state.selectedProductId
        && this.state.selectedContactId
        && this.state.selectedQualityId
        && typeof this.state.amount === 'number'
      );
    } else if(this.state.selectedDeliveryStatus === "DELIVERYLOAN") {
      return !!(
        this.state.selectedDeliveryStatus
        && this.state.selectedDeliveryPlaceId
        && this.state.selectedContactId
      );
    } else {
      return !!(
        this.state.selectedDeliveryStatus
        && this.state.selectedDeliveryPlaceId
        && this.state.selectedProductId
        && this.state.selectedContactId
        && this.state.deliveryTimeValue
        && typeof this.state.amount === 'number'
      );
    }
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
    const { selectedDeliveryStatus, selectedProductId, selectedContactId } = this.state;
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token || !selectedContactId) {
      return;
    }

    if (selectedProductId && selectedDeliveryStatus !== "DELIVERYLOAN") {
      await this.createDelivery();
    } else {
      await this.createDeliveryLoan();
    }

    this.props.onClose(true);
  }

  /**
   * Creates new delivery
   * 
   */
  private createDelivery = async() => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedProductId || !this.state.selectedContactId) {
      return;
    }

    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    let time: string | Date = moment(this.state.selectedDate).format("YYYY-MM-DD");
    time = `${time} ${this.state.deliveryTimeValue}:00 +0000`
    time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();

    const delivery: Delivery = {
      productId: this.state.selectedProductId,
      userId: this.state.selectedContactId,
      time: this.state.selectedDeliveryStatus === "DONE" ? this.state.selectedDate : time,
      status: this.state.selectedDeliveryStatus,
      amount: this.state.amount,
      price: "0",
      deliveryPlaceId: this.state.selectedDeliveryPlaceId,
      qualityId: this.state.selectedDeliveryStatus === "DONE" ? this.state.selectedQualityId : undefined,
      loans: this.state.selectedDeliveryStatus === "DONE"
        ? [
          { item: "RED_BOX", loaned: this.state.redBoxesLoaned, returned: this.state.redBoxesReturned },
          { item: "GRAY_BOX", loaned: this.state.grayBoxesLoaned, returned: this.state.grayBoxesReturned }]
        : []
    }

    const createdDelivery = await deliveryService.createDelivery(delivery);
    await Promise.all(this.state.deliveryNotes.map((deliveryNote): Promise<DeliveryNote | null> => {
      return this.createDeliveryNote(createdDelivery.id || "", deliveryNote);
    }));
  }

    /**
   * Creates new delivery
   * 
   */
  private createDeliveryLoan = async() => {
      if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedContactId) {
        return;
      }
    const deliveryLoansService = await Api.getDeliveryLoansService(this.props.keycloak.token);

    const deliveryLoan: Body1 = {
      comment: this.state.deliveryLoanComment,
      contactId: this.state.selectedContactId,
      loans: [
        { item: "RED_BOX", loaned: this.state.redBoxesLoaned, returned: this.state.redBoxesReturned },
        { item: "GRAY_BOX", loaned: this.state.grayBoxesLoaned, returned: this.state.grayBoxesReturned }
      ]
    }
    try {
      await deliveryLoansService.createDeliveryLoan(deliveryLoan);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * @param deliveryProduct product wich contract qyantities will be fetched
   */
  private fetchContractQuantities = async (selectedProduct?: Product) => {
    const { keycloak } = this.props;
    const { selectedContactId } = this.state;

    if (!keycloak || !keycloak.token || !selectedProduct || !selectedContactId || !keycloak.hasRealmRole(ApplicationRoles.VIEW_CONTRACT_QUANTITIES)) {
      return;
    }

    this.setState({
      loading: true
    });

    const contractsService = await Api.getContractsService(keycloak.token);
    const contractQuantitities = await contractsService.listContractQuantities(selectedProduct?.itemGroupId, selectedContactId);

    this.setState({
      contractQuantities: contractQuantitities,
      loading: false
    })
  }

  /**
   * Renders header 
   */
  private renderHeader() {
    const {  } = this.props;
    const { selectedContactId } = this.state;


    return (
      <div className="modal-header">
        <React.Fragment>
          Uusi toimitus/ehdotus
        </React.Fragment>
        { selectedContactId &&
            this.renderContractInfo() 
        }
      </div>
    )
  }

  /**
   * Renders contract information
   */
  private renderContractInfo = () => {
    const { contractQuantities, amount, selectedProduct } = this.state;
    const { keycloak } = this.props;

    if (!selectedProduct || !contractQuantities || !contractQuantities?.length || !keycloak || !keycloak.hasRealmRole(ApplicationRoles.VIEW_CONTRACT_QUANTITIES)) {
      return null;
    }

    var contractQuantity = 0;
    var delivered = 0
    var remainer = 0;

    contractQuantities.forEach(contract => {
      delivered = delivered + (contract.deliveredQuantity || 0);
      contractQuantity = contractQuantity + (contract.contractQuantity || 0);
    })

    remainer = contractQuantity - delivered - (amount * selectedProduct.units * selectedProduct.unitSize);
  
    return (
      <div className="contract-info">
        <div>
          { strings.contractQuantity }: { contractQuantity }Kg
        </div>
        <div>
          { strings.deliveredQuantity } {delivered }Kg
        </div>
        <div style={{ borderTop: "5px solid #000000 " }}></div>
        <div>
        {
          remainer >= 0 ?
            <div>{ strings.contractRemainer }: { remainer }Kg</div> :
            <div style={{ color: "red" }}>{ strings.contractExceeded }: { Math.abs(remainer) }Kg</div>
        }
        </div>
      </div>
    )
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
   * Renders quality field
   */
  private renderQualityField() {

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
        {deliveryQualityOptions.length > 0 ?
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
    if (!keycloak || !keycloak.token || !selectedContactId) {
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

    const deliveryPlaceOpitons: Options[] = deliveryPlaces.filter(deliveryPlace => deliveryPlace.name !== "Muu").map((deliveryPlace) => {
      return {
        key: deliveryPlace.id,
        value: deliveryPlace.id,
        text: deliveryPlace.name
      };
    });

    return (
      <Modal onClose={() => this.props.onClose()} open={this.props.open}>
        <Modal.Header>{ this.renderHeader() }</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field>
              <label>Viljelijä</label>
              <Dropdown
                selection
                search={true}
                options={contactOptions}
                value={this.state.selectedContactId}
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
              {this.renderDropDown(deliveryPlaceOpitons, "Toimituspaikka", "selectedDeliveryPlaceId")}
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
