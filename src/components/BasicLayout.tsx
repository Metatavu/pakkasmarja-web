import * as React from "react";

import 'semantic-ui-css/semantic.min.css';

import { Container } from "semantic-ui-react";
import MenuContainer from "../containers/MenuContainer";
import FooterContainer from "./FooterContainer";

class BasicLayout extends React.Component {
  render() {
    return (
      <div>
        <MenuContainer siteName="Pakkasmarja Management"/>
        <Container style={{ marginTop: "7em", paddingBottom: "7em" }}>
          {this.props.children}
        </Container>
        <FooterContainer />
      </div>
    );
  }
}

export default BasicLayout;