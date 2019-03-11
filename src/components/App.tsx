import * as React from "react";
import { BrowserRouter, Route } from "react-router-dom";
import MqttConnector from "./MqttConnector";
import MainPage from "./index/MainPage";
import Login from "./login/Login";
import NewsList from "./news/NewsList";
import CreateNews from "./news/CreateNews";
import EditNews from "./news/EditNews";
import WatchNews from "./news/WatchNews";

class App extends React.Component {
  public render() {
    return (
      <MqttConnector>
        <BrowserRouter>
          <div className="App">
            <Route exact path="/" component={MainPage} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/news" component={NewsList} />
            <Route exact path="/createNews" component={CreateNews} />
            <Route exact path="/editNews/:newsId" component={EditNews} />
            <Route exact path="/watchNews/:newsId" component={WatchNews} />
          </div>
        </BrowserRouter>
      </MqttConnector>
    );
  }
}

export default App;



