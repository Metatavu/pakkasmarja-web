import * as React from "react";
import { BrowserRouter, Route } from "react-router-dom";
import MainPage from "./index/MainPage";
import Login from "./login/Login";

class App extends React.Component {
  public render() {
    return (
      <BrowserRouter>
        <div className="App">
          <Route exact path="/" component={MainPage} />
          <Route exact path="/login" component={Login} />
        </div>
      </BrowserRouter>
    );
  }
}

export default App;



