import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Modal, Divider, Header, Image, Loader, Grid, Button } from "semantic-ui-react";
import Api, { PublicFile } from "pakkasmarja-client";
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
  images?: PublicFile[];
  selectedImage?: PublicFile;
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
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token ) {
      return;
    }

    const publicFileService = await Api.getPublicFilesService(this.props.keycloak.token);
    const files: PublicFile[] = await publicFileService.listPublicFiles(0, 100);
    this.setState({ images: files });
  }

  /**
   * On image click
   * 
   * @param image image
   */
  private onImageClick = (image: PublicFile) => {
    this.setState({selectedImage: image});
  }

  /**
   * On image selected
   * 
   * @param url url
   */
  private onImageSelected = (url: string) => {
    this.setState({ selectedImage: undefined });
    this.props.onImageSelected(url);
  }

  /**
   * Render method
   */
  public render() {
    return (
      <Modal size="large" open={this.props.modalOpen} onClose={this.props.onCloseModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            {strings.gallery}
          </Header>
          <Divider />
          <Image.Group size="small">
            {
              !this.state.images && 
              <Grid centered>
                <Loader active size="medium" />
              </Grid>
            }
            {
              this.state.images && this.state.images.map((image) => {
                return (
                  <Image
                    onClick={() => this.onImageClick(image)}
                    key={image.url}
                    src={image.url} 
                    disabled={this.state.selectedImage && this.state.selectedImage.id === image.id}
                  />
                );
              })
            }
          </Image.Group>
          <Button.Group floated="right" className="contract-button-group" >
            <Button onClick={this.props.onCloseModal} color="black">{strings.close}</Button>
            <Button.Or text="" />
            <Button 
              onClick={() => {
                this.onImageSelected(this.state.selectedImage ? this.state.selectedImage.url : "")
              }}
              color="red">
              {strings.save}
            </Button>
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