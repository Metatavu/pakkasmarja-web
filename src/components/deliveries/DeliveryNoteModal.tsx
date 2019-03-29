import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Header, Modal, TextArea } from "semantic-ui-react";
import Dropzone from 'react-dropzone'


/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  modalOpen: boolean;
  closeModal: () => void;
  onNoteChange: (text: string, value: any) => void;
  note: string;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Class for proposal list component
 */
class DeliveryNoteModal extends React.Component<Props, State> {

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
  public componentDidMount = () => {
  }

  /**
   * Close modal
   */
  private closeModal = () => {
    this.props.closeModal();
  }

  /**
   * On delivery place comment change
   * 
   * @param value value
   */
  private onNoteDataChange = (value: string) => {
    this.props.onNoteChange("text", value);
  }

  /**
   * On file dropped
   */
  private onFileDropped = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    console.log(file);
  }

  /**
   * Render method
   */
  public render() {
    return (
      <Modal size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            Lisää huomio
          </Header>
          <Header as="h5">
            Huomio
          </Header>
          <TextArea
            value={this.props.note}
            onChange={(event: any) => {
              this.onNoteDataChange(event.target.value)
            }}
          />
          <Header as="h5">
            Kuva
          </Header>
          <Dropzone multiple activeStyle={{border: "2px solid #62f442"}} style={{width: "100%", cursor:"pointer"}} onDrop={this.onFileDropped}>
            <p style={{paddingTop: "25px", paddingBottom: "10px"}} >Lisää kuva pudottamalla tai klikkaamalla</p>
          </Dropzone>
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
    keycloak: state.keycloak,
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

export default connect(mapStateToProps, mapDispatchToProps)(DeliveryNoteModal);