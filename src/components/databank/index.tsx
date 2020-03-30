import * as React from "react";
import BasicLayout from "../generic/BasicLayout";
import "../../styles/common.css";
import { KeycloakInstance } from "keycloak-js";
import { List, Breadcrumb, Button, Icon } from "semantic-ui-react"

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
   * Location in the folder structure of databank
   */
  location: string;
  /**
   * Example folder structure that will be rendered
   */
  exampleFolderStructure:Array<{type:"file"|"folder", name:string}>; // This is just example type
}

/**
 * Class for databank component
 */
export default class Databank extends React.Component<Props, State> {

  /**
   * Component constructor
   * 
   * @param props component props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      location: "",
      exampleFolderStructure: []
    }
  }

  /**
   * Component did mount life-cycle handler
   */
  public componentDidMount() {
    // make api call here
    const example:Array<{type:"file"|"folder", name:string}> = [ // This is just a temporary example
      {
        type: "folder",
        name: "example folder 1"
      },
      {
        type: "folder",
        name: "example folder 2"
      },
      {
        type: "folder",
        name: "example folder 3"
      },
      {
        type: "folder",
        name: "example folder 4"
      },
      {
        type: "file",
        name: "example file 1"
      },
      {
        type: "file",
        name: "example file 2"
      },
    ]
    this.setState({
      exampleFolderStructure: example
    });
  }

  /**
   * Component did update life-cycle handler
   * 
   * @param prevProps 
   * @param prevState 
   */
  public componentDidUpdate(prevProps:Props, prevState:State) {
    const { location } = this.state;
    if (prevState.location !== location) {
      // make api call here
      this.setState({
        
      });
    }
  }

  /**
   * Render method
   */
  public render() {
    return (
      <BasicLayout>
        { this.state.location.length > 0 && <Button onClick={ this.previousFolder } icon={ <Icon name="arrow left" /> } style={{ marginRight: "25px" }} /> }
        <Breadcrumb>
          { this.renderBreadcrumb() }
        </Breadcrumb>
        <div style={{ marginTop: "1.5rem" }}>
          <List>
            { this.renderFolderStructure() }
          </List>
        </div>
      </BasicLayout>
    );
  }

  /**
   * Downloads a file
   * 
   * Functionality in-progress
   */
  private downloadFile = () => {

  }

  /**
   * Sets location to parent folder
   */
  private previousFolder = () => {
    const { location } = this.state;
    const locations = location.split("/");
    this.setState({
      location: locations.slice(0, locations.length - 1).join("/")
    });
  }

  /**
   * Renders breadcrumb
   */
  private renderBreadcrumb = () => {
    const { location } = this.state;
    const locations = location.split("/");
    return (
      <>
        {
          locations.map((name, index) => {
            return (
              <div key={ index } style={{ userSelect: "none", display: "inline-block" }}>
                <Breadcrumb.Section onClick={ () => { this.moveBackToLocation(index) } }><p style={{ fontSize: "1.8rem" }}>{ name }</p></Breadcrumb.Section>
                <span style={{ marginLeft: "0.5rem", marginRight: "0.5rem", fontSize: "1.8rem" }}>/</span>
              </div>
            )
          })
        }
      </>
    );
  }

  /**
   * Sets location to folder with the given name
   * 
   * @param name name of the folder
   */
  private moveToLocation = (name: string) => {
    const { location } = this.state;
    const locations = location.split("/");
    locations.push(name);
    this.setState({
      location: locations.join("/")
    });
  }

  /**
   * Sets location to location at the index
   * 
   * @param index index of the location
   */
  private moveBackToLocation = (index: number) => {
    const { location } = this.state;
    const locations = location.split("/");
    this.setState({
      location: locations.slice(0, index + 1).join("/")
    });
  }

  /**
   * Renders folder structure
   */
  private renderFolderStructure = () => {
    const { exampleFolderStructure } = this.state;
    return exampleFolderStructure.map((item, index) => {
      return (
        <List.Item key={ index }>
          <List.Content>
            <List.Header>
              <div style={{ cursor:"pointer", userSelect: "none", fontSize: "1.8rem" }}  onClick={ (item.type === "folder") ? () => { this.moveToLocation(item.name) } : this.downloadFile }>
                <List.Icon name={ item.type } />
                <p style={{ display: "inline-block", marginLeft: "1rem" }}>{ item.name }</p>
              </div>
            </List.Header>
          </List.Content>
        </List.Item>
      );
    });
  }
}