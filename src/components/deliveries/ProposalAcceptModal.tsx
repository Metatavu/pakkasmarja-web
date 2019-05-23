import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState, DeliveryProduct, DeliveriesState, deliveryNoteImg64 } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Divider, Image, Dimmer, Loader } from "semantic-ui-react";
import Api, { Delivery } from "pakkasmarja-client";
import strings from "src/localization/strings";
import Lightbox from "react-image-lightbox";
import * as moment from "moment";
import { FileService } from "src/api/file.service";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean;
  closeModal: () => void;
  keycloak?: Keycloak.KeycloakInstance;
  deliveryId: string;
  loadData: () => void;
  deliveries?: DeliveriesState;
  deliveriesLoaded?: (deliveries: DeliveriesState) => void;
  deliveryProduct?: DeliveryProduct;
};

/**
 * Interface for component state
 */
interface State {
  modalOpen: boolean;
  deliveryProduct?: DeliveryProduct;
  redirect: boolean;
  loading: boolean;
  openImage?: string;
  deliveryNotesWithImgBase64: deliveryNoteImg64[];
};

/**
 * Proposal accept modal component class
 */
class ProposalAcceptModal extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      modalOpen: false,
      redirect: false,
      loading: false,
      deliveryNotesWithImgBase64: []
    };
  }

  /**
   * Component did update life-cycle event
   */
  public async componentDidUpdate(prevProps: Props) {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    if (prevProps.deliveryId !== this.props.deliveryId) {
      this.setState({ loading: true });
      const deliveryId: string = await this.props.deliveryId;
      const deliveryProduct = this.props.deliveryProduct;
      await this.getNotes(deliveryId);
      this.setState({ deliveryProduct, loading: false });
    }
  }

  /**
   * Get notes
   */
  private getNotes = async (deliveryId: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !deliveryId || !process.env.REACT_APP_API_URL) {
      return;
    }
    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const deliveryNotes = await deliveriesService.listDeliveryNotes(deliveryId);
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
    this.setState({ deliveryNotesWithImgBase64 });
  }

  /**
   * Close modal
   */
  private closeModal = () => {
    this.props.closeModal();
  }

  /**
   * Handle proposal accept
   */
  private handleProposalAccept = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.deliveryProduct || !this.state.deliveryProduct.product) {
      return;
    }

    const deliveriesService = await Api.getDeliveriesService(this.props.keycloak.token);
    const delivery: Delivery = {
      id: this.state.deliveryProduct.delivery.id,
      productId: this.state.deliveryProduct.product.id || "",
      userId: this.props.keycloak.subject || "",
      time: this.state.deliveryProduct.delivery.time,
      status: "PLANNED",
      amount: this.state.deliveryProduct.delivery.amount,
      price: this.state.deliveryProduct.delivery.price,
      qualityId: this.state.deliveryProduct.delivery.qualityId,
      deliveryPlaceId: this.state.deliveryProduct.delivery.deliveryPlaceId
    }

    const updateDelivery = await deliveriesService.updateDelivery(delivery, this.state.deliveryProduct.delivery.id || "");
    const updatedDeliveryProduct: DeliveryProduct = { delivery: updateDelivery, product: this.state.deliveryProduct.product };
    const updatedDeliveries = this.getUpdatedDeliveryData(updatedDeliveryProduct);
    this.props.deliveriesLoaded && this.props.deliveriesLoaded(updatedDeliveries);
    this.props.loadData();
    this.closeModal();
  }

  /**
   * Get updated delivery data 
   * 
   * @param deliveryProduct deliveryProduct
   */
  private getUpdatedDeliveryData = (deliveryProduct: DeliveryProduct): DeliveriesState => {
    if (!this.props.deliveries) {
      return { frozenDeliveryData: [], freshDeliveryData: [] };
    }

    const deliveries = { ... this.props.deliveries };
    const freshDeliveries = deliveries.freshDeliveryData.map((deliveryData: DeliveryProduct) => {
      if (deliveryData.delivery.id === deliveryProduct.delivery.id) {
        return {
          delivery: deliveryProduct.delivery,
          product: deliveryProduct.product
        }
      }
      return deliveryData;
    });
    const frozenDeliveries = deliveries.frozenDeliveryData.map((deliveryData: DeliveryProduct) => {
      if (deliveryData.delivery.id === deliveryProduct.delivery.id) {
        return {
          delivery: deliveryProduct.delivery,
          product: deliveryProduct.product
        }
      }
      return deliveryData;
    });

    const deliveriesState: DeliveriesState = {
      freshDeliveryData: freshDeliveries || [],
      frozenDeliveryData: frozenDeliveries || []
    }
    return deliveriesState;
  }

  /**
   * Render method
   */
  public render() {
    const { deliveryProduct } = this.state;
    if (!this.state.deliveryProduct || !this.state.deliveryProduct.product || !deliveryProduct || !deliveryProduct.product) {
      return <React.Fragment></React.Fragment>;
    }
    const kilograms = deliveryProduct.delivery.amount * (deliveryProduct.product.units * deliveryProduct.product.unitSize);
    return (
      <Modal style={{ minHeight: "200px" }} size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        {this.state.loading ? <Dimmer active inverted><Loader active inline="centered" size="large" content="Ladataan.." /></Dimmer> :
          <Modal.Content>
            <Header as="h2">
              {strings.acceptSuggestion}
            </Header>
            <Divider />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", flex: 1 }}>
                <div style={{ flex: 0.4 }}>
                  <h4>{strings.productName} </h4>
                </div>
                <div style={{ flex: 1 }}>
                  <p>{deliveryProduct.product.name}</p>
                </div>
              </div>
              <div style={{ display: "flex", flex: 1 }}>
                <div style={{ flex: 0.4 }}>
                  <h4 style={{ display: "inline" }}>Määrä </h4><p style={{ display: "inline" }}>({deliveryProduct.product.unitName})</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p>{deliveryProduct.delivery.amount}</p>
                </div>
              </div>
              <div style={{ display: "flex", flex: 1 }}>
                <div style={{ flex: 0.4 }}>
                  <h4>Kiloa</h4>
                </div>
                <div style={{ flex: 1 }}>
                  <p>{kilograms}</p>
                </div>
              </div>
              <div style={{ display: "flex", flex: 1 }}>
                <div style={{ flex: 0.4 }}>
                  <h4>Toimituspäivä</h4>
                </div>
                <div style={{ flex: 1 }}>
                  <p>{`${moment(deliveryProduct.delivery.time).format("DD.MM.YYYY")} - ${Number(moment(deliveryProduct.delivery.time).utc().format("HH")) > 12 ? "Jälkeen kello 11" : "Ennen kello 11"}`}</p>
                </div>
              </div>
              {deliveryProduct.delivery.price ?
                <div style={{ display: "flex", flex: 1 }}>
                  <div style={{ flex: 0.4 }}>
                    <h4>Maksettu hinta</h4>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p>{deliveryProduct.delivery.price}</p>
                  </div>
                </div>
                : null}
              {this.state.deliveryNotesWithImgBase64[0] ?
                this.state.deliveryNotesWithImgBase64.map((deliveryNote, i) => {
                  return (
                    <React.Fragment key={`${deliveryNote.text} ${i}`}>
                      <h4 style={{ marginTop: 10, marginBottom: 0 }}>Huomio {i + 1}</h4>
                      <div className="delivery-note-container">
                        <div className="delivery-note-img-container">
                          <p>{deliveryNote.img64 ? <Image onClick={() => this.setState({ openImage: deliveryNote.img64 })} src={deliveryNote.img64} size="small" /> : "Ei kuvaa"}</p>
                        </div>
                        <div className="delivery-note-text-container">
                          <p style={{ padding: 20 }}> {deliveryNote.text}</p>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                }) : <Divider style={{ paddingBottom: 0, marginBottom: 0 }} />
              }
            </div>
            {this.state.openImage &&
              <Lightbox
                mainSrc={this.state.openImage}
                onCloseRequest={() => this.setState({ openImage: undefined })}
              />
            }
            <Button.Group floated="right" style={{ marginBottom: 10, marginTop: 10 }} >
              <Button onClick={this.closeModal} color="black">{strings.close}</Button>
              <Button.Or text="" />
              <Button onClick={this.handleProposalAccept} color="red">{strings.accept}</Button>
            </Button.Group>
          </Modal.Content>
        }
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

export default connect(mapStateToProps, mapDispatchToProps)(ProposalAcceptModal);
