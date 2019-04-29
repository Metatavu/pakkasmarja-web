import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Header, Modal, TextArea, Form, Divider, Button } from "semantic-ui-react";
import Dropzone from 'react-dropzone'
import { FileService, FileResponse } from "src/api/file.service";
import { DeliveryNote } from "pakkasmarja-client";
import strings from "src/localization/strings";


/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  modalOpen: boolean;
  closeModal: () => void;
  addDeliveryNote: (deliveryNote: DeliveryNote) => void;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  noteText?: string;
  imgLabel?: string;
  url?: string;
}

/**
 * Class for delivery note modal
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
   * Close modal
   */
  private closeModal = () => {
    this.props.closeModal();
  }

  /**
   * On note data value change
   * 
   * @param value value
   */
  private onNoteDataChange = (value: string) => {
    this.setState({ noteText: value });
  }

  /**
   * On file drop uploads image to server and adds deliveryNote to state
   * 
   * @param file file
   */
  private onFileDropped = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }
    if (this.props.keycloak && this.props.keycloak.token && process.env.REACT_APP_API_URL) {
      const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
      let image: FileResponse | undefined = undefined;
      if (file) {
        image = await fileService.uploadFile(file);
        this.setState({ url: image.url, imgLabel: file.name });
      }
    }
  }

  /**
   * Adds delivery note to parent component state
   */
  private addDeliveryNote = async () => {
    if(this.state.noteText){
      const deliveryNote: DeliveryNote = {
        image: this.state.url,
        text: this.state.noteText
      }
      this.props.addDeliveryNote(deliveryNote);
      this.closeModal();
    }
  }

  /**
   * Render method
   */
  public render() {
    return (
      <Modal size="small" open={this.props.modalOpen} onClose={this.closeModal} closeIcon>
        <Modal.Content>
          <Header as="h3">
            {strings.addNote}
          </Header>
          <Header as="h5">
            {strings.note}
          </Header>
          <Form>
            <Form.Field>
              <TextArea
                value={this.state.noteText}
                onChange={(event: React.FormEvent<HTMLTextAreaElement>) => {
                  this.onNoteDataChange(event.currentTarget.value)
                }}
              />
            </Form.Field>
            <Header as="h5">
              {strings.image}
            </Header>
            <Form.Field>
              <Dropzone multiple activeStyle={{border: "2px solid #62f442"}} style={{width: "100%", cursor:"pointer"}} onDrop={this.onFileDropped}>
                <p style={{paddingTop: "25px", paddingBottom: "10px"}} >
                  {
                    this.state.imgLabel || strings.addImage
                  }
                </p>
              </Dropzone>
            </Form.Field>
          </Form>
          <Divider style={{ paddingBottom: 0, marginBottom: 0 }} />
          <Button.Group floated="right" className="contract-button-group" >
            <Button onClick={this.closeModal} color="black">{strings.close}</Button>
            <Button.Or text="" />
            <Button onClick={this.addDeliveryNote} color="red">{strings.save}</Button>
          </Button.Group>
        </Modal.Content>
      </Modal >
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
