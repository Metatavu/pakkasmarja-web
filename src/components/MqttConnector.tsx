import * as React from "react";
import * as actions from "../actions";
import { MqttConfig, MqttConnection, mqttConnection } from "../mqtt";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";

/**
 * Component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance
}

/**
 * Component state
 */
interface State {
  options?: MqttConfig
}

/**
 * MQTT connector component
 */
class MqttConnector extends React.Component<Props, State> {

  private connection: MqttConnection;
  
  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.connection = mqttConnection;
    this.state = { };
  }

  /**
   * Component did update life-cycle event
   * 
   * @param prevProps previous props
   * @param prevState previous state
   */
  public async componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.keycloak !==  prevProps.keycloak) {
      this.setState({
        options: await this.getConnectionOptions()
      });
    }

    if (this.state.options !== prevState.options) {
      this.connection.disconnect();

      if (this.state.options) {
        this.connection.connect(this.state.options);
      }
    }
  }

  /**
   * Component will unmount life-cycle event
   */
  public componentWillUnmount() {
    this.connection.disconnect();
  }

  /**
   * Component did mount life-cycle event
   */
  public async componentDidMount() {
    this.setState({
      options: await this.getConnectionOptions()
    });
  }

  /**
   * Component render method
   * 
   * @return returns child components
   */
  public render() {
    return this.props.children;
  }

  /**
   * Loads MQTT connection options from the server
   */
  private async getConnectionOptions(): Promise<MqttConfig | undefined> {
    if (!this.props.keycloak) {
      return undefined;
    }

    const url = `${process.env.REACT_APP_API_URL}/mqtt/connection`;
    
    return (await fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.props.keycloak.token}`
      }
    })).json();
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
function mapStateToProps(state: StoreState) {
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
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(MqttConnector);