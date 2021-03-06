import * as React from "react";
import * as actions from "../../actions";
import * as _ from "lodash";
import * as moment from "moment";
import { StoreState, DeliveriesState, Options, DeliveryDataValue, HttpErrorResponse, deliveryNoteImg64 } from "../../types";
import Api, { Product, DeliveryPlace, Delivery, DeliveryNote, DeliveryQuality, ItemGroupCategory, ContractQuantities } from "pakkasmarja-client";
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
  deliveryTimeValue?: number;
  category: string,
  deliveryNotes: DeliveryNote[],
  deliveryNotesWithImgBase64: deliveryNoteImg64[],
  openImage?: string,
  deliveryId?: string,
  modalOpen: boolean,
  userId: string,
  redBoxesLoaned: number,
  redBoxesReturned: number,
  grayBoxesLoaned: number,
  grayBoxesReturned: number,
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
      deliveryNotesWithImgBase64: [],
      amount: 0,
      userId: "",
      deliveryQualities: [],
      redBoxesLoaned: 0,
      redBoxesReturned: 0,
      grayBoxesLoaned: 0,
      grayBoxesReturned: 0,
      modalOpen: false,
      productLoader: false,
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

    const category = this.props.category;
    const delivery = this.props.delivery;
    const userId = this.props.delivery.userId;
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const products: Product[] = await productsService.listProducts(undefined, category, userId, undefined, 100);
    const deliveryProduct = products.find((product) => {
      return product.id == delivery.productId;
    });

    if (!deliveryProduct) {
      throw new Error("Could not find delivery product");
    }

    this.fetchContractQuantities(deliveryProduct);

    const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(category, delivery.productId);
    const deliveryTime = moment(delivery.time).utc().hour() <= 12 ? 11 : 17;

    this.setState({
      products,
      deliveryPlaces: deliveryPlaces.filter(deliveryPlace => deliveryPlace.name !== "Muu"),
      selectedProduct: deliveryProduct,
      userId: delivery.userId,
      deliveryId: delivery.id,
      amount: delivery.amount,
      selectedProductId: delivery.productId,
      selectedPlaceId: delivery.deliveryPlaceId,
      selectedQualityId: delivery.qualityId,
      date: this.props.delivery.time ? new Date(this.props.delivery.time) : new Date(),
      deliveryTimeValue: deliveryTime,
      deliveryQualities: deliveryQualities,
      loading: false
    }, () => this.getNotes());

  }

  /**
   * Load delivery qualities
   */
  private loadDeliveryQualities = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    this.setState({ productLoader: true });
    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(this.props.category, this.state.selectedProductId);
    this.setState({ deliveryQualities, productLoader: false, selectedQualityId: "" });
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

    if( key === "selectedProductId"){
        const selectedProduct = this.state.products.find( product => product.id === value );
        this.loadDeliveryQualities();
        this.setState({ selectedProduct });
        this.fetchContractQuantities(selectedProduct);
    }
  }

  /**
   * @param deliveryProduct product wich contract quantities will be fetched
   */
  private fetchContractQuantities = async (deliveryProduct?: Product) => {
    const { keycloak, delivery } = this.props;

    if (!keycloak || !keycloak.token || !deliveryProduct || !delivery || !keycloak.hasRealmRole(ApplicationRoles.VIEW_CONTRACT_QUANTITIES)) {
      return;
    }
    this.setState({
      loading: true
    });

    const contractsService = await Api.getContractsService(keycloak.token);
    const contractQuantitites = await contractsService.listContractQuantities(deliveryProduct.itemGroupId, delivery.userId);

    this.setState({
      contractQuantities: contractQuantitites,
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
   * Get notes
   */
  private getNotes = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.deliveryId || !process.env.REACT_APP_API_URL) {
      return;
    }
    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const deliveryNotes = await deliveriesService.listDeliveryNotes(this.state.deliveryId);
    const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
    const deliveryNotesWithImgBase64Promises = deliveryNotes.map(async (note) => {
      if (note.image) {
        const imageData = await fileService.getFile(note.image || "");
        const src = `data:image/jpeg;base64,${imageData.data}`
        const deliveryNoteImg64: deliveryNoteImg64 = { text: note.text, img64: src, id: note.id };
        return deliveryNoteImg64;
      } else {
        const deliveryNoteImg64: deliveryNoteImg64 = { text: note.text, img64: "", id: note.id };
        return deliveryNoteImg64;
      }

    })
    const deliveryNotesWithImgBase64 = await Promise.all(deliveryNotesWithImgBase64Promises.map(note => Promise.resolve(note)))
    this.setState({ deliveryNotes, deliveryNotesWithImgBase64 });
  }

  /**
   * Add delivery note to state
   * 
   * @param deliveryNote deliveryNote
   */
  private addDeliveryNote = async (deliveryNote: DeliveryNote) => {
    if (!process.env.REACT_APP_API_URL || !this.props.keycloak || !this.props.keycloak.token || !this.state.deliveryId) {
      return;
    }
    const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
    await deliveryService.createDeliveryNote(deliveryNote, this.state.deliveryId);
    this.getNotes();
  }

  /**
   * Remove note
   */
  private removeNote = async (note: deliveryNoteImg64, index: number) => {
    if (note.id) {
      if (!this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL || !this.state.deliveryId) {
        return;
      }
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      this.filterNotes(index);
      return deliveryService.deleteDeliveryNote(this.state.deliveryId, note.id);
    } else {
      this.filterNotes(index);
    }
  }

  /**
   * filter notes and add to state
   * 
   * @param index
   */
  private filterNotes = (index: number) => {
    const deliveryNotesWithImgBase64 = this.state.deliveryNotesWithImgBase64;
    const newNotesWith64 = deliveryNotesWithImgBase64.filter((note, i) => i !== index);
    const deliveryNotes = this.state.deliveryNotes;
    const newDeliveryNotes = deliveryNotes.filter((note, i) => i !== index);
    this.setState({ deliveryNotesWithImgBase64: newNotesWith64, deliveryNotes: newDeliveryNotes });
  }

  /**
   * Handles delivery submit
   */
  private handleDeliveryAccept = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.deliveryId) {
      return;
    }

    try {
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      const delivery: Delivery = {
        productId: this.state.selectedProductId,
        userId: this.state.userId || "",
        time: this.state.date,
        status: "DONE",
        amount: this.state.amount,
        price: undefined,
        deliveryPlaceId: this.state.selectedPlaceId,
        qualityId: this.state.selectedQualityId,
        loans: [
          { item: "RED_BOX", loaned: this.state.redBoxesLoaned, returned: this.state.redBoxesReturned },
          { item: "GRAY_BOX", loaned: this.state.grayBoxesLoaned, returned: this.state.grayBoxesReturned }
        ]
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

    let time: string | Date = moment(this.state.date).format("YYYY-MM-DD");
    time = `${time} ${this.state.deliveryTimeValue}:00 +0000`
    time = moment(time, "YYYY-MM-DD HH:mm Z").toDate();

    try {
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      const delivery: Delivery = {
        productId: this.state.selectedProductId,
        userId: this.state.userId || "",
        time: time,
        status: this.props.delivery.status,
        amount: this.state.amount,
        price: "0",
        deliveryPlaceId: this.state.selectedPlaceId,
        qualityId: undefined
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
   * Handle delivery reject
   */
  private handleDeliveryReject = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedPlaceId || !this.state.selectedProductId || !this.state.date || !this.state.deliveryId) {
      return;
    }

    try {
      const deliveryService = await Api.getDeliveriesService(this.props.keycloak.token);
      const delivery: Delivery = {
        productId: this.state.selectedProductId,
        userId: this.state.userId || "",
        time: this.state.date,
        status: "NOT_ACCEPTED",
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

    const deliveryTimeValue: Options[] = [{
      key: "deliveryTimeValue1",
      text: "Ennen kello 12",
      value: 11
    }, {
      key: "deliveryTimeValue2",
      text: "Jälkeen kello 12",
      value: 17
    }];

    return (
      <Modal onClose={() => this.props.onClose()} open={this.props.open}>
        <Modal.Header>{ this.renderHeader() }</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Field>
              Tila: {this.getStatusText()}
            </Form.Field>
            {
              this.props.category === "FRESH" &&
              <Form.Field>
                <label>Hinta</label>
                {
                  this.state.selectedProductId &&
                  <PriceChart showLatestPrice time={this.state.date} productId={this.state.selectedProductId} />
                }
              </Form.Field>
            }
            <Form.Field>
              <label>{strings.product}</label>
              {
                this.state.productLoader ? 
                <Loader active inline='centered' size='mini'>ladataan tuotteita...</Loader> 
                :
                productOptions.length > 0 ? this.renderDropDown(productOptions, "selectedProductId") : <p style={{ color: "red" }}>Viljelijällä ei ole voimassa olevaa sopimusta</p>
              }
            </Form.Field>
            {
              this.props.category === "FROZEN" && (this.props.delivery.status === "DELIVERY" || this.props.delivery.status === "PLANNED") ?
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
                : null
            }
            {this.renderQualityField()}
            <Form.Field>
              <label>{`${strings.amount} (${this.renderProductUnitName()})`}</label>
              <Input
                type="number"
                placeholder={strings.amount}
                value={this.state.amount}
                min={0}
                onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                  const value = event.currentTarget.value ? parseInt(event.currentTarget.value) : "";
                  this.handleInputChange("amount", value);
                }}
              />
            </Form.Field>
            {this.props.category === "FRESH" && this.state.amount && this.state.selectedProduct ?
              <Form.Field>
                <p>= <b>{this.state.amount * this.state.selectedProduct.units * this.state.selectedProduct.unitSize} KG</b></p>
              </Form.Field>
              : null
            }
            <Form.Field>
              <label>{strings.deliveryDate}</label>
              <DatePicker
                onChange={(date: Date) => {
                  this.handleInputChange("date", date)
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="aika"
                selected={new Date(this.state.date)}
                dateFormat="dd.MM.yyyy HH:mm"
                locale="fi"
              />
            </Form.Field>
            {
              this.props.delivery.status === "PROPOSAL" &&
              <Form.Field>
                <label>{"Ajankohta"}</label>
                {this.renderDropDown(deliveryTimeValue, "deliveryTimeValue")}
              </Form.Field>
            }
            <Form.Field style={{ marginTop: 20 }}>
              <label>{strings.deliveryPlace}</label>
              {this.renderDropDown(deliveryPlaceOptions, "selectedPlaceId")}
            </Form.Field>
            {this.state.deliveryNotesWithImgBase64.length > 0 ?
              this.state.deliveryNotesWithImgBase64.map((deliveryNote, i) => {
                return (
                  <React.Fragment key={`${deliveryNote.text} ${i}`}>
                    <h4 style={{ marginTop: 5 }}>Huomio {i + 1}</h4>
                    <div style={{ marginBottom: 10 }} className="delivery-note-container">
                      <div className="delivery-note-img-container">
                        <p>{deliveryNote.img64 ? <Image onClick={() => this.setState({ openImage: deliveryNote.img64 })} src={deliveryNote.img64} size="small" /> : "Ei kuvaa"}</p>
                      </div>
                      <div className="delivery-note-text-container">
                        <p style={{ padding: 20 }}> {deliveryNote.text}</p>
                      </div>
                      <div style={{ display: "flex", flex: 0.3, minHeight: "100px", alignItems: "center" }}>
                        <AsyncButton onClick={ async () => await this.removeNote(deliveryNote, i) } color="black">Poista huomio</AsyncButton>
                      </div>
                    </div>
                  </React.Fragment>
                )
              }) : null
            }
            <Button color="red" inverted onClick={() => this.setState({ modalOpen: true })}>{strings.addNote}</Button>
            {this.renderSubmitButton()}
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

  /**
   * Returns status text
   */
  private getStatusText = () => {
    switch (this.props.delivery.status) {
      case "DELIVERY":
        return "Toimituksessa";
      case "DONE":
        return "Hyväksytty";
      case "DELIVERYLOAN":
        return "Muovilaatikoiden toimitus";
      case "PLANNED":
        return "Suunnitelma";
      case "PROPOSAL":
        return "Ehdotus";
      case "REJECTED":
        return "Hylätty";
      case "NOT_ACCEPTED":
        return "Toimitus hylättiin pakkasmarjan toimesta";
    }
  }

  /**
   * Render product unit name
   */
  private renderProductUnitName = () => {
    const { products, selectedProductId } = this.state;
    const product = products.find(product => product.id === selectedProductId);
    return product ? product.unitName : "";
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
    if (this.props.delivery.status == "DONE") {
      return <Button.Group floated="right">
        <AsyncButton disabled={ !this.isValid() } color="black" onClick={ this.handleDeliveryReject } type='submit'>Hylkää toimitus</AsyncButton>
        <Button disabled floated="right" color="grey" type='submit'>Toimitus on jo hyväksytty</Button>;
      </Button.Group>
    }

    if (this.props.delivery.status == "REJECTED") {
      return <Button disabled floated="right" color="grey" type='submit'>Toimitus hylätty</Button>;
    }

    if (this.props.delivery.status == "PROPOSAL" || this.props.delivery.status == "PLANNED") {
      return <Button.Group floated="right">
        <AsyncButton disabled={ !this.isValid() } color="black" onClick={ this.handleDeliveryReject } type='submit'>Hylkää ehdotus</AsyncButton>
        <AsyncButton disabled={ !this.isValid() } color="green" onClick={ this.handleDeliverySave } type='submit'>Muokkaa ehdotusta</AsyncButton>
        <AsyncButton disabled={ !this.isValid() } color="red" onClick={ this.handleDeliveryAccept } type='submit'>Hyväksy toimitus</AsyncButton>
      </Button.Group>;
    }

    if (this.props.delivery.status == "NOT_ACCEPTED") {
      return <Button.Group floated="right">
        <AsyncButton disabled={ !this.isValid() } color="red" onClick={ this.handleDeliveryAccept } type='submit'>Hyväksy toimitus</AsyncButton>
      </Button.Group>;
    }

    return <Button.Group floated="right">
      <AsyncButton disabled={ !this.isValid() } color="black" onClick={ this.handleDeliveryReject } type='submit'>Hylkää toimitus</AsyncButton>
      <AsyncButton disabled={ !this.isValid() } color="red" onClick={ this.handleDeliveryAccept } type='submit'>Hyväksy toimitus</AsyncButton>
    </Button.Group>;
  }

  /**
   * Renders header text
   */
  private renderHeader() {
    const { delivery } = this.props;

    return (
      <div className="modal-header">
        { delivery.status === "DONE" &&
            <React.Fragment>
              Toimitus on jo hyväksytty
            </React.Fragment>
        }
        { delivery.status === "NOT_ACCEPTED" &&
          <React.Fragment>
            Toimitus hylätty
          </React.Fragment>
        }
        { delivery.status === "PROPOSAL" &&
          <React.Fragment>
            Muokkaa ehdotusta
          </React.Fragment>
        }
        { delivery.status === "PLANNED" &&
          <React.Fragment>
            Muokkaa ehdotusta
          </React.Fragment>
        }
        { delivery.status !== "DONE" && delivery.status !== "PROPOSAL" && delivery.status !== "NOT_ACCEPTED" && delivery.status !== "PLANNED" &&
          <React.Fragment>Hyväksy toimitus</React.Fragment>
        }
        { this.renderContractQuantities() }
      </div>
    )
  }

  /**
   * Renders contract information
   */
  private renderContractQuantities = () => {
    const { contractQuantities, amount, selectedProduct } = this.state;
    const { keycloak } = this.props;

    if (!contractQuantities || !contractQuantities?.length || !selectedProduct || !keycloak || !keycloak.hasRealmRole(ApplicationRoles.VIEW_CONTRACT_QUANTITIES)) {
      return null;
    }

    var contractQuantity = 0;
    var delivered = 0
    var remainer = 0;

    contractQuantities?.forEach(contract => {
      if (!contract.contractQuantity) {
        return;
      }
      delivered = delivered + (contract.deliveredQuantity || 0);
      contractQuantity = contractQuantity + contract.contractQuantity;
    })

    remainer = contractQuantity - delivered - (amount * selectedProduct?.units * selectedProduct?.unitSize);

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
            <div>{ strings.contractRemainer }: { remainer }</div> :
            <div style={{ color: "red" }}>{ strings.contractExceeded }: { Math.abs(remainer) }Kg</div>
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
    if (!this.state.selectedPlaceId) {
      return false;
    }

    if (!this.state.selectedProductId) {
      return false;
    }

    if (this.props.delivery.status != "PROPOSAL" || "PLANNED" && !this.state.selectedQualityId) {
      return false;
    }

    if ( typeof this.state.amount !== 'number') {
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
