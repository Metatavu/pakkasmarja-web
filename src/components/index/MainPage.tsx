import * as React from "react";
import * as Keycloak from 'keycloak-js';
import {
  Grid,
  Header
} from "semantic-ui-react";

import * as actions from "../../actions/";
import strings from "../../localization/strings";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { KeycloakInstance } from "keycloak-js";

import "../../styles/commons.scss";

interface Props {
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance
}

interface State {
}

class WelcomePage extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <BasicLayout>
        { this.props.authenticated ? (
          <div>
            <Grid centered>
              <Grid.Row>
                <Header className="welcomeHeader" textAlign="center" >{strings.welcome}</Header>
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

export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    onLogin: (keycloak: KeycloakInstance, authenticated: boolean) => dispatch(actions.userLogin(keycloak, authenticated))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(WelcomePage);;