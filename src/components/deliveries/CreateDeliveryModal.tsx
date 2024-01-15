import * as React from "react";
import { StoreState, Options, DeliveryDataValue, DeliveryNoteImage64 } from "src/types";
import Api, { Product, Delivery, DeliveryNote, Contact, DeliveryPlace, DeliveryStatus, DeliveryQuality, ItemGroupCategory, ContractQuantities } from "pakkasmarja-client";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Dropdown, Form, Input, Button, Divider, Modal, Image, Segment } from "semantic-ui-react";
import DeliveryNoteModal from "./DeliveryNoteModal";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "src/localization/strings";
import PriceChart from "../generic/PriceChart";
import { FileService } from "src/api/file.service";
import Lightbox from "react-image-lightbox";
import DatePicker, { registerLocale } from "react-datepicker";
import AsyncButton from "../generic/asynchronous-button";
import ApplicationRoles from "src/utils/application-roles";
import { filterPossibleDeliveryPlaces } from "src/utils";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  deliveryPlaceId: string;
  onClose: (created?: boolean) => void;
  open: boolean;
  deliveryPlaces: DeliveryPlace[];
  selectedDate?: Date;
  category: ItemGroupCategory;
}

/**
 * Interface for component state
 */
interface State {
  selectedProductId?: string;
  selectedContactId?: string;
  selectedDeliveryPlaceId: string;
  amount: number;
  modalOpen: boolean;
  deliveryNotes: DeliveryNote[];
  contacts: Contact[];
  contactsLoading: boolean;
  selectedProduct?: Product;
  deliveryNoteImages64: DeliveryNoteImage64[];
  openImage?: string;
  selectedDeliveryStatus: DeliveryStatus;
  deliveryQualities: DeliveryQuality[];
  selectedQualityId?: string;
  selectedDate?: Date;
  redBoxesLoaned: number;
  redBoxesReturned: number;
  grayBoxesLoaned: number;
  grayBoxesReturned: number;
  orangeBoxesLoaned: number;
  orangeBoxesReturned: number;
  greenBoxesLoaned: number;
  greenBoxesReturned: number;
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
      selectedDeliveryStatus: "DONE",
      selectedDate: this.props.selectedDate,
      redBoxesLoaned: 0,
      redBoxesReturned: 0,
      grayBoxesLoaned: 0,
      grayBoxesReturned: 0,
      orangeBoxesLoaned: 0,
      orangeBoxesReturned: 0,
      greenBoxesLoaned: 0,
      greenBoxesReturned: 0,
      products: [],
      deliveryLoanComment: "",
      loading: false
    };

    registerLocale("fi", fi);
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

    const deliveryQualities = await Api
      .getDeliveryQualitiesService(keycloak.token)
      .listDeliveryQualities(category, selectedProductId);

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
    if (!options.length) return <Dropdown fluid />;

    return (
      <Dropdown
        selection
        fluid
        placeholder={ placeholder }
        value={ this.state[key] }
        options={ options }
        onChange={ (_, data) => this.handleInputChange(key, data.value) }
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
      selectedDate,
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
          selectedDate &&
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
          selectedDate &&
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
    const deliveryNotes = [ ...this.state.deliveryNotes, deliveryNote ];

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
      amount,
      deliveryNotes,
      redBoxesLoaned,
      redBoxesReturned,
      grayBoxesLoaned,
      grayBoxesReturned,
      orangeBoxesLoaned,
      orangeBoxesReturned,
      greenBoxesLoaned,
      greenBoxesReturned
    } = this.state;

    if (!keycloak || !keycloak.token || !selectedProductId || !selectedContactId || !selectedDate) {
      return;
    }

    const deliveryService = Api.getDeliveriesService(keycloak.token);

    const delivery: Delivery = {
      productId: selectedProductId,
      userId: selectedContactId,
      time: selectedDate,
      status: selectedDeliveryStatus,
      amount: amount,
      price: "0",
      deliveryPlaceId: selectedDeliveryPlaceId,
      qualityId: undefined,
      loans: []
    };

    if (selectedDeliveryStatus !== "DONE") {
      const createdDelivery = await deliveryService.createDelivery(delivery);
      await Promise.all(deliveryNotes.map(deliveryNote => this.createDeliveryNote(createdDelivery.id || "", deliveryNote)));
    } else {
      delivery.status = "PROPOSAL";
      delivery.time = selectedDate;
      delivery.qualityId = selectedQualityId;
      delivery.loans = [
        { item: "RED_BOX", loaned: redBoxesLoaned, returned: redBoxesReturned },
        { item: "GRAY_BOX", loaned: grayBoxesLoaned, returned: grayBoxesReturned },
        { item: "ORANGE_BOX", loaned: orangeBoxesLoaned, returned: orangeBoxesReturned },
        { item: "GREEN_BOX", loaned: greenBoxesLoaned, returned: greenBoxesReturned }
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
      grayBoxesReturned,
      orangeBoxesLoaned,
      orangeBoxesReturned,
      greenBoxesLoaned,
      greenBoxesReturned
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
          { item: "GRAY_BOX", loaned: grayBoxesLoaned, returned: grayBoxesReturned },
          { item: "ORANGE_BOX", loaned: orangeBoxesLoaned, returned: orangeBoxesReturned },
          { item: "GREEN_BOX", loaned: greenBoxesLoaned, returned: greenBoxesReturned }
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
        <>Uusi toimitus/ehdotus</>
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
        <div>{ strings.contractQuantity }: { contractQuantity }Kg</div>
        <div>{ strings.deliveredQuantity } { delivered }Kg</div>
        <div style={{ borderTop: "5px solid #000000 " }}/>
        <div>
          { remainder >= 0
            ? <div>{ strings.contractRemainer }: { remainder }Kg</div>
            : <div style={{ color: "red" }}>{ strings.contractExceeded }: { Math.abs(remainder) }Kg</div>
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
  private handleSearchChange = async (_: any, { searchQuery }: { searchQuery: string }) => {
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
  private removeNote = (_: DeliveryNoteImage64, index: number) => {
    const { deliveryNoteImages64, deliveryNotes } = this.state;
    const newNotesWithImages64 = deliveryNoteImages64.filter((_, i) => i !== index);
    const newDeliveryNotes = deliveryNotes.filter((_, i) => i !== index);

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

    const deliveryQualityOptions = deliveryQualities.map(deliveryQuality => ({
      key: deliveryQuality.id,
      text: deliveryQuality.name,
      value: deliveryQuality.id
    }));

    return (
      <Form.Field>
        <label>Laatu</label>
        { !!deliveryQualityOptions.length
          ? this.renderDropDown(deliveryQualityOptions, "Laatu", "selectedQualityId")
          : <p style={{ color: "red" }}>Valitulla tuotteella ei ole laatuluokkia</p>
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

    const products = await Api
      .getProductsService(keycloak.token)
      .listProducts(undefined, category, selectedContactId, undefined, 100);

    this.setState({ products: products.filter(product => product.active) });
  }

  /**
   * Render method
   */
  public render() {
    const {
      deliveryPlaces,
      open,
      onClose,
      category
    } = this.props;

    const {
      loading,
      products,
      contacts,
      selectedContactId,
      contactsLoading,
      selectedProductId,
      selectedDate,
      selectedDeliveryStatus,
      selectedProduct,
      amount,
      redBoxesReturned,
      redBoxesLoaned,
      grayBoxesReturned,
      grayBoxesLoaned,
      orangeBoxesReturned,
      orangeBoxesLoaned,
      greenBoxesReturned,
      greenBoxesLoaned,
      deliveryNoteImages64,
      openImage,
      modalOpen
    } = this.state;

    if (loading) {
      return (
        <Modal open={ open }>
          <Modal.Header>Uusi toimitus/ehdotus</Modal.Header>
          <Modal.Content>
            <Segment loading />
          </Modal.Content>
        </Modal>
      );
    }

    const productOptions: Options[] = products.map(product => ({
      key: product.id,
      text: product.name,
      value: product.id
    }));

    const contactOptions: Options[] = contacts.map(contact => ({
      key: contact.id,
      text: contact.displayName,
      value: contact.id
    }));

    const doneDeliveryOption: Options = { key: "done", text: "Valmis toimitus", value: "DONE" };
    const deliveryLoanOption: Options = { key: "loan", "text": "Laatikkosiirto", value: "DELIVERYLOAN" };
    const deliveryProposalOption: Options = { key: "proposal", "text": "Ehdotus", value: "PROPOSAL" };

    const frozenDeliveryStatusOptions: Options[] = [ doneDeliveryOption, deliveryLoanOption ];
    const freshDeliveryStatusOptions: Options[] = [ doneDeliveryOption, deliveryProposalOption ];

    const deliveryPlaceOptions: Options[] = filterPossibleDeliveryPlaces(deliveryPlaces, category).map(deliveryPlace => ({
      key: deliveryPlace.id,
      value: deliveryPlace.id,
      text: deliveryPlace.name
    }));

    return (
      <Modal onClose={ () => onClose() } open={ open }>
        <Modal.Header>{ this.renderHeader() }</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field>
              <label>Viljelijä</label>
              <Dropdown
                selection
                search
                options={ contactOptions }
                value={ selectedContactId }
                placeholder="Valitse viljelijä"
                onChange={ (_, data) => this.setState({ selectedContactId: data.value as string }, this.getProducts) }
                onSearchChange={ this.handleSearchChange }
                disabled={ contactsLoading }
                loading={ contactsLoading }
              />
            </Form.Field>
            <Form.Field>
              <label>Tila</label>
              { this.renderDropDown(category === "FRESH" ? freshDeliveryStatusOptions : frozenDeliveryStatusOptions, "Tila", "selectedDeliveryStatus") }
            </Form.Field>
            <Form.Field>
              <label>Toimituspaikka</label>
              { this.renderDropDown(deliveryPlaceOptions, "Toimituspaikka", "selectedDeliveryPlaceId") }
            </Form.Field>
            <Form.Field>
              { selectedProductId && category === "FRESH" &&
                <PriceChart showLatestPrice time={ selectedDate } productId={ selectedProductId } />
              }
            </Form.Field>
            { selectedDeliveryStatus !== "DELIVERYLOAN" &&
              <Form.Field>
                <label>{ strings.product }</label>
                { productOptions.length > 0
                  ? this.renderDropDown(productOptions, strings.product, "selectedProductId")
                  : selectedContactId
                    ? <p style={{ color: "red" }}>Viljelijällä ei ole voimassa olevaa sopimusta</p>
                    : <p style={{ color: "red" }}>Valitse viljelijä</p>
                }
              </Form.Field>
            }
            <Form.Field>
              <label>{ strings.deliveryDate }</label>
              <DatePicker
                onChange={ (date: Date) => this.setState({ selectedDate: date }) }
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={ 15 }
                timeCaption="aika"
                selected={ selectedDate }
                dateFormat="dd.MM.yyyy HH:mm"
                locale="fi"
              />
            </Form.Field>
            { selectedDeliveryStatus === "DONE" && selectedProduct &&
              <Form.Field>
                { this.renderQualityField() }
              </Form.Field>
            }
            { selectedDeliveryStatus !== "DELIVERYLOAN" &&
                <Form.Field>
                  <label>{ `${strings.amount} ${selectedProduct ? `(${selectedProduct.unitName})` : ""}` }</label>
                  <Input
                    placeholder={ strings.amount }
                    value={ amount }
                    type="number"
                    min={ 0 }
                    onChange={ event => {
                      const value = event.currentTarget.value ? parseInt(event.currentTarget.value) : "";
                      this.handleInputChange("amount", value);
                    } }
                  />
                </Form.Field>
            }
            {category === "FRESH" && amount && selectedProduct ?
              <Form.Field>
                <p>= <b>{ amount * selectedProduct.units * selectedProduct.unitSize } KG</b></p>
              </Form.Field>
              : null
            }
            { [ "DONE", "DELIVERYLOAN" ].includes(selectedDeliveryStatus) && category === "FROZEN" &&
              <React.Fragment>
                <Form.Field>
                  <label>{ strings.redBoxesReturned }</label>
                  <Input
                    type="number"
                    placeholder="Palautettu"
                    value={ redBoxesReturned }
                    onChange={ (_, data) => this.setState({ redBoxesReturned: parseInt(data.value) }) }
                  />
                </Form.Field>
                <Form.Field>
                  <label>{ strings.redBoxesLoaned }</label>
                  <Input
                    type="number"
                    placeholder="Lainattu"
                    value={ redBoxesLoaned }
                    onChange={(_, data) => this.setState({ redBoxesLoaned: parseInt(data.value) }) }
                  />
                </Form.Field>
                <Form.Field>
                  <label>{ strings.grayBoxesReturned }</label>
                  <Input
                    type="number"
                    placeholder="Palautettu"
                    value={ grayBoxesReturned }
                    onChange={ (_, data) => this.setState({ grayBoxesReturned: parseInt(data.value) }) }
                  />
                </Form.Field>
                <Form.Field>
                  <label>{ strings.grayBoxesLoaned }</label>
                  <Input
                    type="number"
                    placeholder="Lainattu"
                    value={ grayBoxesLoaned }
                    onChange={ (_, data) => this.setState({ grayBoxesLoaned: parseInt(data.value) }) }
                  />
                </Form.Field>
                <Form.Field>
                  <label>{ strings.orangeBoxesReturned }</label>
                  <Input
                    type="number"
                    placeholder="Palautettu"
                    value={ orangeBoxesReturned }
                    onChange={ (_, data) => this.setState({ orangeBoxesReturned: parseInt(data.value) }) }
                  />
                </Form.Field>
                <Form.Field>
                  <label>{ strings.orangeBoxesLoaned }</label>
                  <Input
                    type="number"
                    placeholder="Lainattu"
                    value={ orangeBoxesLoaned }
                    onChange={ (_, data) => this.setState({ orangeBoxesLoaned: parseInt(data.value) }) }
                  />
                </Form.Field>
                <Form.Field>
                  <label>{ strings.greenBoxesReturned }</label>
                  <Input
                    type="number"
                    placeholder="Palautettu"
                    value={ greenBoxesReturned }
                    onChange={ (_, data) => this.setState({ greenBoxesReturned: parseInt(data.value) }) }
                  />
                </Form.Field>
                <Form.Field>
                  <label>{ strings.greenBoxesLoaned }</label>
                  <Input
                    type="number"
                    placeholder="Lainattu"
                    value={ greenBoxesLoaned }
                    onChange={ (_, data) => this.setState({ greenBoxesLoaned: parseInt(data.value) }) }
                  />
                </Form.Field>
                { selectedDeliveryStatus === "DELIVERYLOAN" &&
                  <Form.Field>
                    <label>Kommentti</label>
                    <Input
                      type="string"
                      placeholder="Kommentti"
                      onChange={ this.handleDeliveryLoanCommentChange }
                      value={ this.state.deliveryLoanComment || "" }
                    />
                  </Form.Field>
                }
              </React.Fragment>
            }
            { deliveryNoteImages64[0]
              ? deliveryNoteImages64.map((deliveryNote, i) => (
                  <React.Fragment key={ `${deliveryNote.text} ${i}` }>
                    <h4 style={{ marginTop: 14 }}>Huomio { i + 1 }</h4>
                    <div style={{ marginBottom: 10 }} className="delivery-note-container">
                      <div className="delivery-note-img-container">
                        <p>
                          { deliveryNote.img64
                            ? <Image
                                onClick={ () => this.setState({ openImage: deliveryNote.img64 }) }
                                src={ deliveryNote.img64 }
                                size="small"
                              />
                            : "Ei kuvaa"
                          }
                        </p>
                      </div>
                      <div className="delivery-note-text-container">
                        <p style={{ padding: 20 }}>{ deliveryNote.text }</p>
                      </div>
                      <div style={{ display: "flex", flex: 0.2, minHeight: "100px", alignItems: "center" }}>
                        <Button onClick={ () => this.removeNote(deliveryNote, i) } color="black">
                          Poista huomio
                        </Button>
                      </div>
                    </div>
                  </React.Fragment>
                ))
              : <Divider />
            }
            { selectedDeliveryStatus !== "DELIVERYLOAN" &&
              <Button
                color="red"
                inverted
                onClick={ () => this.setState({ modalOpen: true }) }
              >
                {`${strings.addNote}`}
              </Button>
            }
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <AsyncButton
                color="red"
                disabled={ !this.isValid() }
                onClick={ this.handleDeliverySubmit }
                type="submit"
              >
                Tallenna
              </AsyncButton>
            </div>
          </Form>
          { openImage &&
            <Lightbox
              mainSrc={ openImage }
              onCloseRequest={ () => this.setState({ openImage: undefined }) }
            />
          }
          <DeliveryNoteModal
            modalOpen={ modalOpen }
            closeModal={ () => this.setState({ modalOpen: false }) }
            addDeliveryNote={ this.addDeliveryNote }
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
export const mapStateToProps = (state: StoreState) => ({
  authenticated: state.authenticated,
  keycloak: state.keycloak
});

export default connect(mapStateToProps)(CreateDeliveryModal);
