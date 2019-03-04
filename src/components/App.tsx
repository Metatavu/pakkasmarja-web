import * as React from "react";
import { BrowserRouter, Route } from "react-router-dom";
import MqttConnector from "./MqttConnector";
import MainPage from "./index/MainPage";
import Login from "./login/Login";

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



