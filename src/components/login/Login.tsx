import * as React from "react";
import * as Keycloak from 'keycloak-js';
import {
  Grid,
  Loader
} from "semantic-ui-react";
import * as actions from "../../actions";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { KeycloakInstance } from "keycloak-js";
import { connect } from "react-redux";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  onLogin?: (keycloak: Keycloak.KeycloakInstance, authenticated: boolean) => void;
  redirectPath?: string;
}

/**
 * Interface for component state
 */
interface State {
  loadingRealms: boolean;
  redirectPath: string;
}

/**
 * Class for component login
 */
class Login extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      loadingRealms: false,
      redirectPath: "/"
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount() {
    if (this.props.redirectPath) {
      this.setState({ redirectPath: this.props.redirectPath });
    }

    if (!this.props.authenticated) {
      this.doLogin();
    }
  }

  /**
   * Do login
   */
  private doLogin() {
    const kcConf = {
      "realm": process.env.REACT_APP_REALM,
      "url": process.env.REACT_APP_AUTH_SERVER_URL,
      "clientId": process.env.REACT_APP_AUTH_RESOURCE
    };
    
    const keycloak = Keycloak(kcConf);
    keycloak.init({onLoad: "login-required"}).success((authenticated) => {
      this.props.onLogin && this.props.onLogin(keycloak, authenticated);
    });
  }

  /**
   * Render method
   */
  public render() {
    return (
      <BasicLayout>
        { this.props.authenticated ? (
          <Redirect to={this.state.redirectPath} />
        ) : (
          <Grid centered>
            <Loader active size="medium" />
          </Grid>
        )}
      </BasicLayout>
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
    onLogin: (keycloak: KeycloakInstance, authenticated: boolean) => dispatch(actions.userLogin(keycloak, authenticated))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);