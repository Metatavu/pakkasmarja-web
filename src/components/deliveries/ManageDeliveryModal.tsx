import * as React from "react";
import * as actions from "../../actions";
import * as _ from "lodash";
import { StoreState, DeliveriesState, Options, DeliveryDataValue, HttpErrorResponse, DeliveryNoteImage64 } from "../../types";
import Api, { Product, DeliveryPlace, Delivery, DeliveryNote, DeliveryQuality, ItemGroupCategory, ContractQuantities, DeliveryStatus } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Dropdown, Form, Input, Button, Modal, Segment, Image, Loader } from "semantic-ui-react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fi from 'date-fns/esm/locale/fi';
import strings from "../../localization/strings";
import PriceChart from "../generic/PriceChart";
import { FileService } from "src/api/file.service";
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import DeliveryNoteModal from "./DeliveryNoteModal";
import AsyncButton from "../generic/asynchronous-button";
import ApplicationRoles from "src/utils/application-roles";
import { filterPossibleDeliveryPlaces } from "src/utils";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance,
  delivery: Delivery
  open: boolean,
  onError?: (errorMsg: string) => void,
  onClose: () => void,
  onUpdate: () => void,
  category: ItemGroupCategory,
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
  deliveryNotesWithImageBase64: DeliveryNoteImage64[],
  openImage?: string,
  deliveryId?: string,
  modalOpen: boolean,
  userId: string,
  redBoxesLoaned: number,
  redBoxesReturned: number,
  grayBoxesLoaned: number,
  grayBoxesReturned: number,
  orangeBoxesLoaned: number,
  orangeBoxesReturned: number,
  greenBoxesLoaned: number,
  greenBoxesReturned: number,
  selectedProduct?: Product,
  productLoader: boolean,
  contractQuantities?: ContractQuantities[]
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
      deliveryNotesWithImageBase64: [],
      amount: 0,
      userId: "",
      deliveryQualities: [],
      redBoxesLoaned: 0,
      redBoxesReturned: 0,
      grayBoxesLoaned: 0,
      grayBoxesReturned: 0,
      orangeBoxesLoaned: 0,
      orangeBoxesReturned: 0,
      greenBoxesLoaned: 0,
      greenBoxesReturned: 0,
      modalOpen: false,
      productLoader: false,
    };
    registerLocale("fi", fi);
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    const { keycloak, category, delivery } = this.props;

    if (!keycloak?.token) {
      return;
    }

    this.setState({ loading: true });

    const productsService = Api.getProductsService(keycloak.token);
    const deliveryPlacesService = Api.getDeliveryPlacesService(keycloak.token);
    const deliveryQualitiesService = Api.getDeliveryQualitiesService(keycloak.token);

    const [ deliveryPlaces, products, deliveryQualities ] = await Promise.all([
      deliveryPlacesService.listDeliveryPlaces(),
      productsService.listProducts(undefined, category, delivery.userId, undefined, 100),
      deliveryQualitiesService.listDeliveryQualities(category, delivery.productId)
    ]);

    const deliveryProduct = products.find(product => product.id == delivery.productId);

    if (!deliveryProduct) {
      throw new Error("Could not find delivery product");
    }

    this.fetchContractQuantities(deliveryProduct);

    this.setState(
      {
        products,
        deliveryPlaces: deliveryPlaces.filter(deliveryPlace => deliveryPlace.name !== "Muu"),
        selectedProduct: deliveryProduct,
        userId: delivery.userId,
        deliveryId: delivery.id,
        amount: delivery.amount,
        selectedProductId: delivery.productId,
        selectedPlaceId: delivery.deliveryPlaceId,
        selectedQualityId: delivery.qualityId,
        date: delivery.time ? new Date(delivery.time) : new Date(),
        deliveryQualities: deliveryQualities,
        loading: false
      },
      this.getNotes
    );

  }

  /**
   * Load delivery qualities
   */
  private loadDeliveryQualities = async () => {
    const { keycloak, category } = this.props;
    const { selectedProductId } = this.state;

    if (!keycloak?.token) {
      return;
    }

    this.setState({ productLoader: true });

    const deliveryQualities = await Api
      .getDeliveryQualitiesService(keycloak.token)
      .listDeliveryQualities(category, selectedProductId);

    this.setState({
      deliveryQualities: deliveryQualities,
      productLoader: false,
      selectedQualityId: ""
    });
  }

  /**
   * Check if object is http error response
   *
   * @param object object to check
   */
  private isHttpErrorResponse = (object: any): object is HttpErrorResponse => {
    return "code" in object;
  }

  /**
   * Handle input change
   *
   * @param key key
   * @param value value
   */
  private handleInputChange = (key: string, value: DeliveryDataValue) => {
    const { products } = this.state;

    const state: State = this.state;
    state[key] = value;

    this.setState(state);

    if (key === "selectedProductId") {
        const selectedProduct = products.find(product => product.id === value);
        this.loadDeliveryQualities();
        this.setState({ selectedProduct: selectedProduct });
        this.fetchContractQuantities(selectedProduct);
    }
  }

  /**
   * Fetches contract quantities
   *
   * @param deliveryProduct product which contract quantities will be fetched
   */
  private fetchContractQuantities = async (deliveryProduct?: Product) => {
    const { keycloak, delivery } = this.props;

    if (
      !keycloak?.token ||
      !deliveryProduct ||
      !delivery ||
      !keycloak.hasRealmRole(ApplicationRoles.VIEW_CONTRACT_QUANTITIES)
    ) {
      return;
    }

    this.setState({ loading: true });

    const contractQuantities = await Api
      .getContractsService(keycloak.token)
      .listContractQuantities(deliveryProduct.itemGroupId, delivery.userId);

    this.setState({
      contractQuantities: contractQuantities,
      loading: false
    })
  }

  /**
   * Render drop down
   *
   * @param options options
   * @param key key
   */
  private renderDropDown = (options: Options[], key: string) => {
    if (!options.length) {
      return <Dropdown fluid />;
    }

    const value = this.state[key];

    return (
      <Dropdown
        selection
        fluid
        placeholder="Valitse"
        value={ value }
        options={ options }
        onChange={ (_, data) => this.handleInputChange(key, data.value) }
      />
    );
  }

  /**
   * Get notes
   */
  private getNotes = async () => {
    const { keycloak } = this.props;
    const { deliveryId } = this.state;

    if (!keycloak?.token || !deliveryId || !process.env.REACT_APP_API_URL) {
      return;
    }

    const deliveryNotes = await Api
      .getDeliveriesService(keycloak.token)
      .listDeliveryNotes(deliveryId);

    const fileService = new FileService(process.env.REACT_APP_API_URL, keycloak.token);

    const deliveryNotesWithImageBase64Promises = deliveryNotes.map<Promise<DeliveryNoteImage64>>(async note => ({
      text: note.text,
      img64: note.image ?
        `data:image/jpeg;base64,${(await fileService.getFile(note.image || "")).data}` :
        "",
      id: note.id
    }));

    const deliveryNotesWithImageBase64 = await Promise.all(
      deliveryNotesWithImageBase64Promises.map(note => Promise.resolve(note))
    );

    this.setState({
      deliveryNotes: deliveryNotes,
      deliveryNotesWithImageBase64: deliveryNotesWithImageBase64
    });
  }

  /**
   * Add delivery note to state
   *
   * @param deliveryNote deliveryNote
   */
  private addDeliveryNote = async (deliveryNote: DeliveryNote) => {
    const { keycloak } = this.props;
    const { deliveryId } = this.state;

    if (!process.env.REACT_APP_API_URL || !keycloak?.token || !deliveryId) {
      return;
    }

    await Api.getDeliveriesService(keycloak.token).createDeliveryNote(deliveryNote, deliveryId);

    this.getNotes();
  }

  /**
   * Remove note
   *
   * @param note note
   * @param index index
   */
  private removeNote = async (note: DeliveryNoteImage64, index: number) => {
    const { keycloak } = this.props;
    const { deliveryId } = this.state;

    if (!note.id) {
      this.filterNotes(index);
      return;
    }

    if (!keycloak?.token || !process.env.REACT_APP_API_URL || !deliveryId) {
      return;
    }

    this.filterNotes(index);

    return Api.getDeliveriesService(keycloak.token).deleteDeliveryNote(deliveryId, note.id);
  }

  /**
   * filter notes and add to state
   *
   * @param index index
   */
  private filterNotes = (index: number) => {
    const { deliveryNotesWithImageBase64, deliveryNotes } = this.state;

    this.setState({
      deliveryNotesWithImageBase64: deliveryNotesWithImageBase64.filter((_, i) => i !== index),
      deliveryNotes: deliveryNotes.filter((_, i) => i !== index)
    });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliveryAccept = async () => {
    const { keycloak, onError, onUpdate } = this.props;
    const {
      selectedPlaceId,
      selectedProductId,
      deliveryId,
      userId,
      date,
      amount,
      selectedQualityId,
      redBoxesLoaned,
      redBoxesReturned,
      grayBoxesLoaned,
      grayBoxesReturned,
      orangeBoxesLoaned,
      orangeBoxesReturned,
      greenBoxesLoaned,
      greenBoxesReturned,
    } = this.state;

    if (!keycloak?.token || !selectedPlaceId || !selectedProductId || !deliveryId) {
      return;
    }

    try {
      const response = await Api.getDeliveriesService(keycloak.token).updateDelivery({
        productId: selectedProductId,
        userId: userId || "",
        time: date,
        status: "DONE",
        amount: amount,
        price: undefined,
        deliveryPlaceId: selectedPlaceId,
        qualityId: selectedQualityId,
        loans: [
          { item: "RED_BOX", loaned: redBoxesLoaned, returned: redBoxesReturned },
          { item: "GRAY_BOX", loaned: grayBoxesLoaned, returned: grayBoxesReturned },
          { item: "ORANGE_BOX", loaned: orangeBoxesLoaned, returned: orangeBoxesReturned },
          { item: "GREEN_BOX", loaned: greenBoxesLoaned, returned: greenBoxesReturned }
        ]
      }, deliveryId);

      if (this.isHttpErrorResponse(response)) {
        onError?.((response as HttpErrorResponse).message);
        return;
      }

      onUpdate();
    } catch (e) {
      onError?.(strings.errorCommunicatingWithServer);

      this.setState({ loading: false });
    }
  }

  /**
   * Handles delivery submit
   */
  private handleDeliverySave = async () => {
    const { keycloak, onError, onUpdate } = this.props;
    const {
      selectedPlaceId,
      selectedProductId,
      date,
      deliveryId,
      userId,
      amount
    } = this.state;

    if (
      !keycloak?.token ||
      !selectedPlaceId ||
      !selectedProductId ||
      !date ||
      !deliveryId
    ) {
      return;
    }

    try {
      const response = await Api.getDeliveriesService(keycloak.token).updateDelivery({
        productId: selectedProductId,
        userId: userId || "",
        time: date,
        status: this.props.delivery.status,
        amount: amount,
        price: "0",
        deliveryPlaceId: selectedPlaceId,
        qualityId: undefined
      }, deliveryId);

      if (this.isHttpErrorResponse(response)) {
        const errorResponse: HttpErrorResponse = response;
        onError?.(errorResponse.message);
        return;
      }

      onUpdate();
    } catch (e) {
      onError?.(strings.errorCommunicatingWithServer);

      this.setState({ loading: false });
    }
  }

  /**
   * Handle delivery reject
   */
  private handleDeliveryReject = async () => {
    const { keycloak, onError, onUpdate } = this.props;
    const {
      selectedPlaceId,
      selectedProductId,
      date,
      deliveryId,
      userId,
      amount
    } = this.state;

    if (
      !keycloak?.token ||
      !selectedPlaceId ||
      !selectedProductId ||
      !date ||
      !deliveryId
    ) {
      return;
    }

    try {
      const response = await Api.getDeliveriesService(keycloak.token).updateDelivery({
        productId: selectedProductId,
        userId: userId || "",
        time: date,
        status: DeliveryStatus.NOTACCEPTED,
        amount: amount,
        price: "0",
        deliveryPlaceId: selectedPlaceId,
        qualityId: this.state.selectedQualityId
      }, deliveryId);

      if (this.isHttpErrorResponse(response)) {
        const errorResponse: HttpErrorResponse = response;
        onError?.(errorResponse.message);
        return;
      }

      onUpdate();
    } catch (e) {
      onError?.(strings.errorCommunicatingWithServer);
      this.setState({ loading: false });
    }
  }

  /**
   * Render method
   */
  public render = () => {
    const {
      open,
      onClose,
      category,
      delivery
    } = this.props;

    const {
      loading,
      products,
      deliveryPlaces,
      selectedProductId,
      date,
      productLoader,
      redBoxesReturned,
      redBoxesLoaned,
      grayBoxesReturned,
      grayBoxesLoaned,
      orangeBoxesReturned,
      orangeBoxesLoaned,
      greenBoxesReturned,
      greenBoxesLoaned,
      amount,
      selectedProduct,
      deliveryNotesWithImageBase64,
      openImage,
      modalOpen
    } = this.state;

    if (loading) {
      return (
        <Modal open={ open }>
          <Modal.Header>Toimituksen hyväksyntä</Modal.Header>
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

    const deliveryPlaceOptions: Options[] = filterPossibleDeliveryPlaces(deliveryPlaces, category).map(deliveryPlace => ({
      key: deliveryPlace.id,
      text: deliveryPlace.name,
      value: deliveryPlace.id
    }));

    return (
      <Modal onClose={ onClose } open={ open }>
        <Modal.Header>{ this.renderHeader() }</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field>
              Tila: { this.getStatusText() }
            </Form.Field>
            { category === "FRESH" &&
              <Form.Field>
                <label>Hinta</label>
                { selectedProductId &&
                  <PriceChart
                    showLatestPrice
                    time={ date }
                    productId={ selectedProductId }
                  />
                }
              </Form.Field>
            }
            <Form.Field>
              <label>{ strings.product }</label>
              { productLoader ?
                <Loader active inline="centered" size="mini">ladataan tuotteita...</Loader> :
                !!productOptions.length ?
                  this.renderDropDown(productOptions, "selectedProductId") :
                  <p style={{ color: "red" }}>Viljelijällä ei ole voimassa olevaa sopimusta</p>
              }
            </Form.Field>
            { category === "FROZEN" && (delivery.status === "DELIVERY" || delivery.status === "PLANNED") &&
              <>
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
              </>
            }
            { this.renderQualityField() }
            <Form.Field>
              <label>{`${strings.amount} (${this.renderProductUnitName()})`}</label>
              <Input
                type="number"
                placeholder={ strings.amount }
                value={ amount }
                min={ 0 }
                onChange={(_, { value }) => this.handleInputChange("amount", parseInt(value)) }
              />
            </Form.Field>
            { category === "FRESH" && amount && selectedProduct &&
              <Form.Field>
                <p>= <b>{ amount * selectedProduct.units * selectedProduct.unitSize } KG</b></p>
              </Form.Field>
            }
            <Form.Field>
              <label>{ strings.deliveryDate }</label>
              <DatePicker
                onChange={ date => date && this.handleInputChange("date", date as Date) }
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={ 15 }
                timeCaption="aika"
                selected={ new Date(date) }
                dateFormat="dd.MM.yyyy HH:mm"
                locale="fi"
              />
            </Form.Field>
            <Form.Field style={{ marginTop: 20 }}>
              <label>
                { strings.deliveryPlace }
              </label>
              { this.renderDropDown(deliveryPlaceOptions, "selectedPlaceId") }
            </Form.Field>
            { deliveryNotesWithImageBase64.map((deliveryNote, i) => (
                <React.Fragment key={`${deliveryNote.text} ${i}`}>
                  <h4 style={{ marginTop: 5 }}>
                    Huomio { i + 1 }
                  </h4>
                  <div
                    style={{ marginBottom: 10 }}
                    className="delivery-note-container"
                  >
                    <div className="delivery-note-img-container">
                      <p>
                        { deliveryNote.img64 ?
                          <Image
                            onClick={ () => this.setState({ openImage: deliveryNote.img64 }) }
                            src={ deliveryNote.img64 }
                            size="small"
                          /> :
                          "Ei kuvaa"
                        }
                      </p>
                    </div>
                    <div className="delivery-note-text-container">
                      <p style={{ padding: 20 }}>
                        { deliveryNote.text }
                      </p>
                    </div>
                    <div style={{ display: "flex", flex: 0.3, minHeight: "100px", alignItems: "center" }}>
                      <AsyncButton
                        onClick={ () => this.removeNote(deliveryNote, i) }
                        color="black"
                      >
                        Poista huomio
                      </AsyncButton>
                    </div>
                  </div>
                </React.Fragment>
              ))
            }
            <Button
              color="red"
              inverted
              onClick={ () => this.setState({ modalOpen: true }) }
            >
              { strings.addNote }
            </Button>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              { this.renderSubmitButton() }
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

  /**
   * Returns status text
   */
  private getStatusText = () => ({
    [DeliveryStatus.DELIVERY]: "Toimituksessa",
    [DeliveryStatus.DONE]: "Hyväksytty",
    [DeliveryStatus.DELIVERYLOAN]: "Muovilaatikoiden toimitus",
    [DeliveryStatus.PLANNED]: "Suunnitelma",
    [DeliveryStatus.PROPOSAL]: "Ehdotus",
    [DeliveryStatus.REJECTED]: "Hylätty",
    [DeliveryStatus.NOTACCEPTED]: "Toimitus hylättiin pakkasmarjan toimesta"
  })[this.props.delivery.status] || "";

  /**
   * Render product unit name
   */
  private renderProductUnitName = () => {
    const { products, selectedProductId } = this.state;
    const product = products.find(product => product.id === selectedProductId);
    return product?.unitName || "";
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
        { deliveryQualityOptions.length > 0 ?
          this.renderDropDown(deliveryQualityOptions, "selectedQualityId") :
          <p style={{ color: "red" }}>Valitulla tuotteella ei ole laatuluokkia</p>
        }
      </Form.Field>
    );
  }

  /**
   * Renders submit button
   */
  private renderSubmitButton() {
    const { delivery } = this.props;

    if (delivery.status === DeliveryStatus.DONE) {
      return (
        <Button.Group>
          <AsyncButton
            color="black"
            onClick={ this.handleDeliveryReject }
            type="submit"
          >
            Hylkää toimitus
          </AsyncButton>
          <Button
            disabled
            color="grey"
            type="submit"
          >
            Toimitus hyväksytty
          </Button>
        </Button.Group>
      );
    }

    if (delivery.status == DeliveryStatus.REJECTED || delivery.status == DeliveryStatus.NOTACCEPTED) {
      return (
        <Button.Group>
          <Button disabled color="grey">
            Toimitus hylätty
          </Button>
        </Button.Group>
      );
    }

    if (delivery.status == DeliveryStatus.PROPOSAL || delivery.status == DeliveryStatus.PLANNED) {
      return (
        <Button.Group>
          <AsyncButton
            color="black"
            onClick={ this.handleDeliveryReject }
            type="submit"
          >
            Hylkää ehdotus
          </AsyncButton>
          <AsyncButton
            color="green"
            onClick={ this.handleDeliverySave }
            type="submit"
          >
            Muokkaa ehdotusta
          </AsyncButton>
          <AsyncButton
            disabled={ !this.isValid() }
            color="red"
            onClick={ this.handleDeliveryAccept }
            type="submit"
          >
            Hyväksy toimitus
          </AsyncButton>
        </Button.Group>
      );
    }

    return (
      <Button.Group>
        <AsyncButton
          disabled={ !this.isValid() }
          color="black"
          onClick={ this.handleDeliveryReject }
          type="submit"
        >
          Hylkää toimitus
        </AsyncButton>
        <AsyncButton
          disabled={ !this.isValid() }
          color="red"
          onClick={ this.handleDeliveryAccept }
          type="submit"
        >
          Hyväksy toimitus
        </AsyncButton>
      </Button.Group>
    );
  }

  /**
   * Renders header text
   */
  private renderHeader() {
    const { delivery } = this.props;

    let title = "Hyväksy toimitus";

    switch (delivery.status) {
      case DeliveryStatus.DONE:
        title = "Toimitus on jo hyväksytty";
        break;
      case DeliveryStatus.NOTACCEPTED:
        title = "Toimitus hylätty";
        break;
      case DeliveryStatus.PROPOSAL:
        title = "Muokkaa ehdotusta";
        break;
      case DeliveryStatus.PLANNED:
        title = "Muokkaa ehdotusta";
        break;
      default:
        break;
    }

    return (
      <div className="modal-header">
        { title }
        { this.renderContractQuantities() }
      </div>
    )
  }

  /**
   * Renders contract information
   */
  private renderContractQuantities = () => {
    const { contractQuantities, amount, selectedProduct } = this.state;
    const { keycloak, delivery } = this.props;

    if (
      !contractQuantities?.length ||
      !selectedProduct ||
      !keycloak ||
      !keycloak.hasRealmRole(ApplicationRoles.VIEW_CONTRACT_QUANTITIES)
    ) {
      return null;
    }

    var contractQuantity = 0;
    var delivered = 0
    var remainder = 0;

    contractQuantities?.forEach(contract => {
      if (!contract.contractQuantity) {
        return;
      }

      delivered = delivered + (contract.deliveredQuantity || 0);
      contractQuantity = contractQuantity + contract.contractQuantity;
    })

    if (delivery.status === "DONE") {
      remainder = contractQuantity - delivered;
    } else {
      remainder = contractQuantity - delivered - (amount * selectedProduct?.units * selectedProduct?.unitSize);
    }


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
          remainder >= 0 ?
            <div>{ strings.contractRemainer }: { remainder }Kg</div> :
            <div style={{ color: "red" }}>{ strings.contractExceeded }: { Math.abs(remainder) }Kg</div>
        }
        </div>
      </div>
    )
  }

  /**
   * Returns whether form is valid or not
   *
   * @return whether form is valid or not
   */
  private isValid = () => {
    const { delivery } = this.props;
    const { selectedPlaceId, selectedProductId, amount, selectedQualityId } = this.state;

    const conditions: boolean[] = [
      !!selectedPlaceId,
      !!selectedProductId,
      ![ DeliveryStatus.PROPOSAL, DeliveryStatus.PLANNED ].includes(delivery.status),
      delivery.status !== DeliveryStatus.DELIVERY || !!selectedQualityId,
      !!amount
    ];

    return conditions.every(condition => condition === true);
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
