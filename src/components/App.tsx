import * as React from "react";
import { BrowserRouter, Route } from "react-router-dom";
import MainPage from "../containers/MainPage";
import Login from "../containers/Login";
import MqttConnector from "./MqttConnector";

class App extends React.Component {
  public render() {
    return (
      <MqttConnector>
        <BrowserRouter>
          <div className="App">
            <Route exact path="/" component={MainPage} />
            <Route exact path="/login" component={Login} />
          </div>
        </BrowserRouter>
      </MqttConnector>
    );
  }
}

export default App;



