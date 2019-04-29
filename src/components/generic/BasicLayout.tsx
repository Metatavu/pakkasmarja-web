import * as React from "react";

import 'semantic-ui-css/semantic.min.css';

import { Container, Header, Image, Segment, Button } from "semantic-ui-react";
import MenuContainer from "./MenuContainer";
import PakkasmarjaLogo from "../../gfx/pakkasmarja-logo.svg";
import { Redirect } from "react-router-dom";

interface Props {
  pageTitle?: string,
  topBarButtonText?: string
  onTopBarButtonClick?: () => void
  redirectTo?: string
}

class BasicLayout extends React.Component<Props, any> {

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = () => {
    window.scrollTo(0, 0);
  }
  
  render() {
    if (this.props.redirectTo) {
      return <Redirect to={this.props.redirectTo} />
    }

    return (
      <div>
        <div style={{backgroundColor: "#E51D2A", color: "#fff"}}>
          <Container>
            <Header style={{padding:"15px", color: "#fff"}} as="h1">
              <Image src={PakkasmarjaLogo} />
              {this.props.pageTitle || "Pakkasmarja"}
              { this.props.onTopBarButtonClick &&
                <Button style={{marginTop: "20px"}} onClick={() => {this.props.onTopBarButtonClick!();}} floated="right" inverted size="large">{this.props.topBarButtonText || "Uusi"}</Button>
              }
            </Header>
          </Container>
          <MenuContainer />
        </div>
        <Container style={{ marginTop: "4em", paddingBottom: "7em" }}>
          <Segment>
            {this.props.children}
          </Segment>
        </Container>
      </div>
    );
  }
}

export default BasicLayout;