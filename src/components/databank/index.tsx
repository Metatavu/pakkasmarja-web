import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import "../../styles/common.css";
import { KeycloakInstance } from "keycloak-js";
import { List, Breadcrumb, Button, Icon, Modal, FormButton, Input, Select } from "semantic-ui-react"
import TiedostoIkoni from "../../gfx/tiedostoikoni.svg";
import KuvaTiedosto from "../../gfx/kuva.svg";
import PdfIkoni from "../../gfx/pdfikoni.svg";
import Api, { SharedFile, FileType } from "pakkasmarja-client";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import strings from "src/localization/strings";

/**
 * Component props
 */
interface Props {
  authenticated: boolean,
  keycloak?: KeycloakInstance,
}

/**
 * Component state
 */
interface State {
  /**
   * Path to the current location in databank
   */
  path: string;
  /**
   * Files and folders that will be rendered
   */
  sharedFiles: SharedFile[];
  /**
   * Whether or not add new modal is open
   */
  addNewodalOpen: boolean;
  /**
   * Contains data of new shared file
   */
  newSharedFile: newSharedFile;
}

interface newSharedFile {
  name?: string;
  type?: "FILE" | "FOLDER";
  file?: File;
}

/**
 * Class for databank component
 */
class Databank extends React.Component<Props, State> {

  /**
   * Component constructor
   * 
   * @param props component props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      path: "",
      sharedFiles: [],
      addNewodalOpen: false,
      newSharedFile: {}
    }
  }

  /**
   * Component did mount life-cycle handler
   */
  public async componentDidMount() {
    this.updateSharedFiles();
  }

  /**
   * Component did update life-cycle handler
   * 
   * @param prevProps 
   * @param prevState 
   */
  public componentDidUpdate(prevProps: Props, prevState: State) {
    const { path } = this.state;
    if (prevState.path !== path) {
      this.updateSharedFiles();
    }
  }

  /**
   * Render method
   */
  public render() {
    return (
      <BasicLayout>
        { this.state.path.length > 0 && <Button onClick={ this.previousFolder } icon={ <Icon name="arrow left" /> } style={{ marginRight: "25px" }} /> }
        <Breadcrumb>
          { this.renderBreadcrumb() }
        </Breadcrumb>
        { this.props.keycloak && this.props.keycloak.hasRealmRole("manage-shared-files") &&
          <div onClick={ this.addNewModalToggle } style={{ cursor:"pointer", userSelect: "none", fontSize: "1.8rem", marginTop: "1.5rem", fontWeight: 700 }}>
            <Icon name='add square' color="red" style={{ fontSize: 27, marginRight: 10 }} />
            <p style={{ display: "inline-block", marginLeft: "1rem" }}>{ strings.addNew }</p>
          </div>
        }
        <div style={{ marginTop: "1.5rem" }}>
          <List>
            { this.renderFolderStructure() }
          </List>
        </div>
        <Modal open={ this.state.addNewodalOpen } style={{ width: "25rem" }}>
          <Modal.Header>
            Lisää uusi kansio tai tiedosto
          </Modal.Header>
          <Modal.Content>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, marginBottom: "1rem" }}>
                <Input name="name"  type="text" placeholder="Nimi" onChange={ this.onChangeNewSharedFile } />
              </div>
              <div style={{ flex: 1, marginBottom: "1rem" }}>
                <Select options={ [{ text: "Kansio", value:"FOLDER" }, { text: "Tiedosto", value: "FILE" }] } name="type" onChange={ this.onChangeNewSharedFile } />
              </div>
              { this.state.newSharedFile.type === "FILE" &&
                <div style={{ flex: 1, marginBottom: "1rem" }}>
                  <input name="file" type="file" onChange={ this.onChangeNewSharedFile } />
                </div>
              }
            </div>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
              <FormButton onClick={ this.addNewModalToggle }>Peruuta</FormButton>
              <Button color="red" onClick={ this.addNewSharedFile }>Lisää</Button>
            </div>
          </Modal.Content>
        </Modal>
      </BasicLayout>
    );
  }

  /**
   * Renders folder structure
   */
  private renderFolderStructure = () => {
    const { sharedFiles } = this.state;
    return sharedFiles.map((item, index) => {
      return (
        <List.Item key={ index }>
          <List.Content>
            <List.Header>
              <div style={{ width: "100%", fontSize: "1.8rem" }}>
                <div style={{ cursor:"pointer", userSelect: "none", fontSize: "1.8rem", width: "80%", display: "inline-block" }}  onClick={ (item.fileType === "FOLDER") ? () => { this.moveToLocation(item.name) } :  () => { this.downloadFile(item) } }>
                  { this.getImage(item.fileType) }
                  <p style={{ display: "inline-block", marginLeft: "1rem", marginBottom: 0 }}>{ item.name }</p>
                </div>
                { this.props.keycloak && this.props.keycloak.hasRealmRole("manage-shared-files") &&
                  <Icon name='trash' color="red" onClick={ () => { this.deleteSharedFile(item) } } style={{ display: "inline-block", float: "right", paddingTop: 10, cursor: "pointer" }} />
                }
              </div>
            </List.Header>
          </List.Content>
        </List.Item>
      );
    });
  }

  /**
   * Renders breadcrumb
   */
  private renderBreadcrumb = () => {
    const { path } = this.state;
    const locations = path.split("/");
    return (
      <>
        {
          locations.map((name, index) => {
            return (
              <div key={ index } style={{ userSelect: "none", display: "inline-block" }}>
                <span style={{ marginLeft: "0.5rem", marginRight: "0.5rem", fontSize: "1.8rem" }}>/</span>
                <Breadcrumb.Section onClick={ () => { this.moveBackToLocation(index) } }><p style={{ fontSize: "1.8rem" }}>{ name }</p></Breadcrumb.Section>
              </div>
            )
          })
        }
      </>
    );
  }

  /**
   * Handles creating new shared file
   */
  private addNewSharedFile = async () => {
    const { keycloak } = this.props;
    const { newSharedFile, path } = this.state;
    if ((!keycloak || !keycloak.token) || !newSharedFile.name || (this.props.keycloak && !this.props.keycloak.hasRealmRole("manage-shared-files"))) {
      return;
    }
    if (newSharedFile.type === "FILE" && newSharedFile.file) {
      const formData = new FormData();
      formData.append('file', newSharedFile.file);
      const requestUrl = `${process.env.REACT_APP_API_URL}/rest/v1/sharedFiles/upload/file`;
      const ext = this.getFileExtension(newSharedFile.file.name);
      const fileName = `fileName=${newSharedFile.name}${ext ? ext : ""}`;
      const pathPrefix = path ? `pathPrefix=${path}/` : "";
      try {
        await fetch(`${requestUrl}?${fileName}&${pathPrefix}`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${keycloak.token}`
          },
          body: formData
        });
        this.updateSharedFiles();
        this.setState({
          addNewodalOpen: false,
          newSharedFile: { name: undefined, type: undefined, file: undefined }
        });
      } catch (error) {
        console.log(error);
      }
    } else if (newSharedFile.type === "FOLDER") {
      try {
        await Api.getSharedFilesService(keycloak.token).uploadSharedFolder(`${newSharedFile.name}/`, path ? `${path}/` : undefined);
        this.updateSharedFiles();
        this.setState({
          addNewodalOpen: false,
          newSharedFile: { name: undefined, type: undefined, file: undefined }
        });
      } catch (error) {
        console.log(error);
      }
    }
  }

  /**
   * Handles deleting shared file
   */
  private deleteSharedFile = async (sharedFile: SharedFile) => {
    const { keycloak } = this.props;
    const { path } = this.state;
    if (!keycloak || !keycloak.token) {
      return;
    }
    try {
      if (window.confirm(`Haluatko varmasti poistaa ${ sharedFile.fileType === "FOLDER" ? "kansion" : "tiedoston" } nimeltä "${ sharedFile.name }"?`)) {
        const response = await Api.getSharedFilesService(keycloak.token).deleteSharedFile(sharedFile.fileType === "FOLDER" ? `${sharedFile.name}/` : sharedFile.name, path ? `${path}/` : undefined);
        if (response.code === 403) {
          alert(response.message);
        }
        this.updateSharedFiles();
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Handles changing new shared file data
   */
  private onChangeNewSharedFile = (event: any, data?:any) => {
    const { newSharedFile } = this.state;
    switch(event.target.name) {
      case "name": {
        newSharedFile.name = event.target.value;
        break;
      }
      case "file": {
        if (event.target.files.length) {
          newSharedFile.file = event.target.files[0];
        }
        break;
      }
      default: {
        if (data.value === "FOLDER") {
          newSharedFile.file = undefined;
        }
        newSharedFile.type = data.value;
        break;
      }
    }
    this.setState({
      newSharedFile: newSharedFile
    });
  }

  /**
   * Toggles on or off current add new modal state
   */
  private addNewModalToggle = () => {
    const { addNewodalOpen } = this.state;
    this.setState({
      addNewodalOpen: !addNewodalOpen,
      newSharedFile: { name: undefined, type: undefined, file: undefined }
    });
  }

  /**
   * Updates shared files
   */
  private updateSharedFiles = async () => {
    const { keycloak } = this.props;
    const { path } = this.state;
    if (!keycloak || !keycloak.token) {
      return;
    }
    try {
      const sharedFiles = await Api.getSharedFilesService(keycloak.token).listSharedFiles(path ? `${path}/` : undefined);
      if (Array.isArray(sharedFiles)) {
        this.setState({
          sharedFiles: sharedFiles.map((file) => {
            return {...file, name: file.name.replace(/\//g, "")}
          })
          .sort((a, b) => {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          })
          .sort((a, b) => {
            return Number(b.fileType === "FOLDER") - Number(a.fileType === "FOLDER");
          })
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Downloads a file
   * 
   * @param file shared file
   */
  private downloadFile = async (file: SharedFile): Promise<any>  => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/rest/v1/sharedFiles/download?${file.pathPrefix ? "pathPrefix=" + file.pathPrefix.replace(/\//g, "%2F") + "&" : ""}fileName=${file.name}`, {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${keycloak.token}`
        },
      });
      if (response.body) {
        const body = await this.readStream(response.body);
        //const fileType = await filetype.fromBuffer(body);
        if (body) { // && fileType
          const dataObj = window.URL.createObjectURL(new Blob([body]));
          const link = document.createElement('a');
          document.body.appendChild(link);
          link.href = dataObj;
          link.download=`${file.name}`; //.${fileType.ext}
          link.click();
          setTimeout(() => {
            window.URL.revokeObjectURL(dataObj);
          }, 100);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Reads stream and returns its value
   * 
   * @param stream readable stream
   */
  private readStream = async (stream: ReadableStream) => {
    const reader = stream.getReader();
    let result: Uint8Array = new Uint8Array();
    let finished = false;
    while (!finished) {
      await reader.read().then(({ done, value }) => {
        if (done) {
          finished = true
        } else {
          const chunk = new Uint8Array(result.length + value.length);
          chunk.set(result);
          chunk.set(value, result.length);
          result = chunk;
        }
      });
    }
    return result;
  }

  /**
   * Sets location to parent folder
   */
  private previousFolder = () => {
    const { path } = this.state;
    const locations = path.split("/");
    this.setState({
      path: locations.slice(0, locations.length - 1).join("/")
    });
  }

  /**
   * Sets location to folder with the given name
   * 
   * @param name name of the folder
   */
  private moveToLocation = (name: string) => {
    const { path } = this.state;
    this.setState({
      path: path ? `${ path }/${ name }` : name
    });
  }

  /**
   * Sets location to location at the index
   * 
   * @param index index of the location
   */
  private moveBackToLocation = (index: number) => {
    const { path } = this.state;
    const locations = path.split("/");
    this.setState({
      path: locations.slice(0, index + 1).join("/")
    });
  }

  /**
   * Checks file type and returns custom image JSX for it
   * 
   * @param type file type
   */
  private getImage = (type: FileType) => {
    switch(type) {
      case "OTHER": {
        return <img src={ TiedostoIkoni } style={{ width: 30, marginRight: 13 }} />;
      }
      case "FOLDER": {
        return <Icon name='folder' color="red" style={{ display: "inline-block", fontSize: 27, marginRight: 10, paddingTop: 10 }} />;
      }
      case "PDF": {
        return <img src={ PdfIkoni } style={{ width: 30, marginRight: 13 }} />;
      }
      case "IMAGE": {
        return <img src={ KuvaTiedosto } style={{ width: 30, marginRight: 13 }} />;
      }
    }
  }

  /**
   * Get file extension from file name if available
   * 
   * @param fileName name of the file
   * @returns file extension as string
   */
  private getFileExtension = (fileName: string): string => {
    const resultArray = fileName.match(/\.\w{3,4}$/g);
    return resultArray ? resultArray[0] : "";
  }
}

/**
 * Redux mapper for mapping store state to component props
 *
 * @param state store state
 */
export function mapStateToProps(state: StoreState) {
  return {
    keycloak: state.keycloak
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

export default connect(mapStateToProps, mapDispatchToProps)(Databank);