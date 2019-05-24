import * as React from "react";

import 'semantic-ui-css/semantic.min.css';

import { Container, Header, Image, Button, Dimmer } from "semantic-ui-react";
import MenuContainer from "../generic/MenuContainer";
import PakkasmarjaLogo from "../../gfx/pakkasmarja-logo.svg";
import { Redirect } from "react-router-dom";

interface Props {
  pageTitle?: string,
  topBarButtonText?: string
  onTopBarButtonClick?: () => void
  redirectTo?: string
  error?: string,
  onErrorClose?: () => void
}

class TableBasicLayout extends React.Component<Props, any> {

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = () => {
    window.scrollTo(0, 0);
  }

  public render() {
    if (this.props.redirectTo) {
      return <Redirect to={this.props.redirectTo} />
    }

    if (this.props.error) {
      return (
        <Dimmer active inverted>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ color: "red" }}> Virhe! </h3>
            <p style={{ color: "black" }}> {this.props.error} </p>
            <Button basic onClick={this.props.onErrorClose}> Sulje </Button>
          </div>
        </Dimmer>
      );
    }

    return (
      <div>
        <div style={{ backgroundColor: "#E51D2A", color: "#fff" }}>
          <Container>
            <Header style={{ padding: "15px", color: "#fff" }} as="h1">
              <Image src={PakkasmarjaLogo} />
              {this.props.pageTitle || "Pakkasmarja"}
              {this.props.onTopBarButtonClick &&
                <Button style={{ marginTop: "20px" }} onClick={() => { this.props.onTopBarButtonClick!(); }} floated="right" inverted size="large">{this.props.topBarButtonText || "Uusi"}</Button>
              }
            </Header>
          </Container>
          <MenuContainer />
        </div>
        <div style={{
          maxWidth: "90%",
          marginTop: "50px",
          paddingBottom: "100px",
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          {this.props.children}
        </div>
      </div >
    );
  }
}

export default TableBasicLayout;