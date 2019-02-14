import * as React from "react";
import {
  Container,
  Segment,
} from "semantic-ui-react";

class FooterContainer extends React.Component<object, object> {

  render() {
    return (
      <Segment inverted vertical style={{width: "100%", backgroundColor: "#E51D2A", position: "fixed", bottom: "0"}}>
        <Container textAlign="center">
          
        </Container>
      </Segment>
    );
  }
}

export default FooterContainer;