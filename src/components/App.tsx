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
import ContractTerms from "./contracts/ContractTerms";
import Deliveries from "./deliveries/DeliveriesScreen";
import WeekDeliveryPredictionView from "./deliveries/WeekDeliveryPredictionView";
import CreateDelivery from "./deliveries/CreateDelivery";
import EditDelivery from "./deliveries/EditDelivery";

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
            <Route exact path="/contracts/:contractId/terms" component={ContractTerms} />
            <Route exact path="/deliveries" component={Deliveries} />
            <Route exact path="/createDelivery/:category" component={CreateDelivery} />
            <Route exact path="/editDelivery/:category/:deliveryId" component={EditDelivery} />
            <Route exact path="/weekDeliveryPredictions/:weekDeliveryPredictionId" component={WeekDeliveryPredictionView} />
          </div>
        </BrowserRouter>
      </MqttConnector>
    );
  }
}

export default App;



