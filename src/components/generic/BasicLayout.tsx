import * as React from "react";

import 'semantic-ui-css/semantic.min.css';

import { Container } from "semantic-ui-react";
import MenuContainer from "./MenuContainer";

class BasicLayout extends React.Component {
  render() {
    return (
      <div>
        <MenuContainer siteName="Pakkasmarja Management"/>
        <Container style={{ marginTop: "7em", paddingBottom: "7em" }}>
          {this.props.children}
        </Container>
      </div>
    );
  }
}

export default BasicLayout;