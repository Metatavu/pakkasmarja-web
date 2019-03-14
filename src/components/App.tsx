import * as React from "react";
import { BrowserRouter, Route } from "react-router-dom";
import MqttConnector from "./MqttConnector";
import MainPage from "./index/MainPage";
import Login from "./login/Login";
import NewsList from "./news/NewsList";
import CreateNews from "./news/CreateNews";
import EditNews from "./news/EditNews";
import WatchNews from "./news/WatchNews";
import ContractList from "./contracts/ContractList";
import ContractView from "./contracts/ContractView";

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
        <BrowserRouter>
          <div className="App">
            <Route exact path="/" component={MainPage} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/news" component={NewsList} />
            <Route exact path="/createNews" component={CreateNews} />
            <Route exact path="/editNews/:newsId" component={EditNews} />
            <Route exact path="/watchNews/:newsId" component={WatchNews} />
            <Route exact path="/contracts" component={ContractList} />
            <Route exact path="/contracts/:contractId" component={ContractView} />
          </div>
        </BrowserRouter>
      </MqttConnector>
    );
  }
}

export default App;



