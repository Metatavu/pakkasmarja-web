import * as React from "react";
import MqttConnector from "./MqttConnector";
import MainPage from "./index/MainPage";
import { BrowserRouter } from "react-router-dom";

/**
 * App component
 */
class App extends React.Component {

  /**
   * Render method for app component
   */
  public render() {
    return (
      <MqttConnector>
        <div className="App">
          <BrowserRouter>
            <MainPage />
          </BrowserRouter>
        </div>
      </MqttConnector>
    );
  }
}

export default App;



