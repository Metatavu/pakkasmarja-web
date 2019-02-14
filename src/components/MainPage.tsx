import * as React from "react";
import * as Keycloak from 'keycloak-js';
import {
  Grid,
  Header
} from "semantic-ui-react";

import strings from "../localization/strings";
import BasicLayout from "./BasicLayout";
import { Redirect } from "react-router";

export interface Props {
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance
}

interface State {
  loadingRealms: boolean
}

class WelcomePage extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      loadingRealms: false
    };
  }

  render() {
    return (
      <BasicLayout>
        { this.props.authenticated ? (
          <div>
            <Grid centered>
              <Grid.Row>
                <Header textAlign="center" >{strings.welcome}</Header>
              </Grid.Row>
            </Grid>
          </div>
        ) : (
          <Redirect to="/login" />
        )}
      </BasicLayout>
    );
  }
}

export default WelcomePage;