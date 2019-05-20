import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Modal, Header, Button } from "semantic-ui-react";
import { FileService, FileResponse } from "src/api/file.service";
import Dropzone from "react-dropzone";
import Api from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  modalOpen: boolean;
  onCloseModal: () => void;
  onImageSelected: (url: string) => void;
}

/**
 * Interface for component state
 */
interface State {
  url: string;
  imgLabel: string;
}

/**
 * Class for image gallery component
 */
class ImageGallery extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      url: "",
      imgLabel: ""
    };
  }

   /**
   * On file drop uploads image to server and adds deliveryNote to state
   * 
   * @param file file
   */
  private onFileDropped = async (files: File[]) => {
    if (!this.props.keycloak || !this.props.keycloak.token ) {
      return;
    }

    const file = files[0];
    if (!file) {
      return;
    }

    if (this.props.keycloak && this.props.keycloak.token && process.env.REACT_APP_API_URL) {
      let image: FileResponse | undefined = undefined;
      if (file) {
        const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
        image = await fileService.uploadFile(file);

        const publicFilesServie = Api.getPublicFilesService(this.props.keycloak.token);
        await publicFilesServie.createPublicFile({
          url: image.url
        });

        this.setState({ url: image ? image.url : "", imgLabel: file.name });
      }
    }
  }

  /**
   * Render method
   */
  public render() {
    return (
      <Modal size="large" open={this.props.modalOpen} onClose={this.props.onCloseModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            {strings.uploadImage}
          </Header>
          <Dropzone multiple activeStyle={{border: "2px solid #62f442"}} style={{width: "100%", cursor:"pointer"}} onDrop={this.onFileDropped}>
            <p style={{paddingTop: "25px", paddingBottom: "10px"}} >
              {
                this.state.imgLabel || strings.addImage
              }
            </p>
          </Dropzone>
          <Button.Group floated="right" className="contract-button-group" >
            <Button onClick={this.props.onCloseModal} color="black">{strings.close}</Button>
            <Button.Or text="" />
            <Button onClick={() => this.props.onImageSelected(this.state.url)} color="red">{strings.save}</Button>
          </Button.Group>
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
function mapStateToProps(state: StoreState) {
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
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ImageGallery);