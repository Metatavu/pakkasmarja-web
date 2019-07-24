import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState, DeliveryProduct, deliveryNoteImg64 } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Modal, Header, Button, Divider, Loader, Dimmer, Image } from "semantic-ui-react";
import Api, { DeliveryQuality } from "pakkasmarja-client";
import strings from "src/localization/strings";
import * as moment from "moment";
import { FileService } from "src/api/file.service";
import Lightbox from "react-image-lightbox";

/**
 * Interface for component props
 */
interface Props {
  modalOpen: boolean,
  closeModal: () => void,
  keycloak?: Keycloak.KeycloakInstance;
  deliveryId: string
  deliveryQuality?: DeliveryQuality;
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
  deliveryNotesWithImgBase64: deliveryNoteImg64[];
  openImage?: string;
  alvAmount: number;
};

/**
 * View delivery modal component class
 */
class ViewModal extends React.Component<Props, State> {

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
      deliveryNotesWithImgBase64: [],
      alvAmount: 1.14
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
      const deliveryProduct = this.props.deliveryProduct
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
   * Render method
   */
  public render() {
    const { deliveryProduct } = this.state;
    if (!deliveryProduct || !deliveryProduct.product) {
      return <React.Fragment></React.Fragment>;
    }
    const { status } = deliveryProduct.delivery;
    const kilograms = (deliveryProduct.delivery.amount * (deliveryProduct.product.units * deliveryProduct.product.unitSize)).toFixed(2);
    return (
      <Modal style={{ minHeight: "200px" }} size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        {this.state.loading ? <Dimmer active inverted><Loader active inline="centered" size="large" content="Ladataan.." /></Dimmer> :
          <Modal.Content>
            <Header as="h1">
              {strings.delivery}
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
                  <h4 style={{ display: "inline" }}>Määrä </h4><p style={{ display: "inline" }}>({deliveryProduct.product.unitName.toLocaleUpperCase()})</p>
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
                  {
                    status === "DONE" || status === "NOT_ACCEPTED" ?
                      <h4>{status === "DONE" ? "Hyväksytty" : "Hylätty"}</h4>
                      :
                      <h4>Toimituspäivä</h4>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  {
                    status === "DONE" || status === "NOT_ACCEPTED" ?
                      <p>{`${moment(deliveryProduct.delivery.time).format("DD.MM.YYYY HH:mm")}`}</p>
                      :
                      <p>{`${moment(deliveryProduct.delivery.time).format("DD.MM.YYYY")} - ${Number(moment(deliveryProduct.delivery.time).utc().format("HH")) > 12 ? "Jälkeen kello 12" : "Ennen kello 12"}`}</p>
                  }
                </div>
              </div>
              {deliveryProduct.delivery.price ?
                <div style={{ display: "flex", flex: 1 }}>
                  <div style={{ flex: 0.4 }}>
                    <h4>Kilohinta</h4>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p>{`${Number(deliveryProduct.delivery.price) * this.state.alvAmount} € / ${deliveryProduct.product.unitName.toLocaleUpperCase()} ALV 14%`}</p>
                  </div>
                </div>
                : null}
              {this.props.deliveryQuality ?
                <div style={{ display: "flex", alignItems: "center", marginTop: 10, marginBottom: 10, flex: 1 }}>
                  <div style={{ flex: 0.4 }}>
                    <h4>Laatuluokka</h4>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div className="delivery-quality-container" style={{ backgroundColor: this.props.deliveryQuality.color || "grey" }}>
                      <p style={{ fontWeight: "bold" }}>{this.props.deliveryQuality.name.slice(0, 1)}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: this.props.deliveryQuality.color || "black", width: "15%" }} >{this.props.deliveryQuality.name}</h4>
                    </div>
                  </div>
                </div>
                : null}
              {this.state.deliveryNotesWithImgBase64.length > 0  ?
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
            <Button floated="right" onClick={this.closeModal} style={{ marginBottom: 10, marginTop: 10 }} color="black">
              {strings.close}
            </Button>
            {this.state.openImage &&
              <Lightbox
                mainSrc={this.state.openImage}
                onCloseRequest={() => this.setState({ openImage: undefined })}
              />
            }
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
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ViewModal);
