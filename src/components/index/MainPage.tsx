import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { withRouter } from "react-router-dom";
import { Route } from "react-router";
import Login from "../login/Login";
import NewsList from "../news/NewsList";
import CreateNews from "../news/CreateNews";
import EditNews from "../news/EditNews";
import WatchNews from "../news/WatchNews";
import ContractList from "../contracts/ContractList";
import ContractView from "../contracts/ContractView";
import ContractTerms from "../contracts/ContractTerms";
import ContractManagementList from "../contract-management/ContractManagementList";
import CreateContract from "../contract-management/CreateContract";
import EditContract from "../contract-management/EditContract";
import EditContractDocument from "../contract-management/EditContractDocument";
import WatchContract from "../contract-management/WatchContract";
import CreateDelivery from "../deliveries/CreateDelivery";
import EditDelivery from "../deliveries/EditDelivery";
import ItemGroupsManagementList from "../itemgroups-management/ItemGroupsManagementList";
import CreateItemGroup from "../itemgroups-management/CreateItemGroup";
import EditItemGroupDocument from "../itemgroups-management/EditItemGroupDocument";
import ItemGroupPricesList from "../itemgroups-management/ItemGroupPricesList";
import CreateWeekDeliveryPrediction from "../deliveries/CreateWeekDeliveryPrediction";
import ManageIncomingDeliveries from "../deliveries/ManageIncomingDeliveries";
import ManageDelivery from "../deliveries/ManageDelivery";
import DeliveriesScreen from "../deliveries/DeliveriesScreen";
import WelcomePage from "./WelcomePage";
import ProductsList from "../products-management/ProductsList";
import CreateProduct from "../products-management/CreateProduct";
import EditProduct from "../products-management/EditProduct";
import OperationsList from "../operations-management/OperationsList";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Class for main page component
 */
class MainPage extends React.Component<Props, {}> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  /**
   * Render method
   */
  public render() {
    if (!this.props.authenticated) {
      return (
        <Login />
      );
    }
    return (
      <div>
        <Route exact path="/" component={WelcomePage} />
        <Route exact path="/news" component={NewsList} />
        <Route exact path="/createNews" component={CreateNews} />
        <Route exact path="/editNews/:newsId" component={EditNews} />
        <Route exact path="/watchNews/:newsId" component={WatchNews} />
        <Route exact path="/contracts" component={ContractList} />
        <Route exact path="/contracts/:contractId" component={ContractView} />
        <Route exact path="/contracts/:contractId/terms" component={ContractTerms} />
        <Route exact path="/contractManagement" component={ContractManagementList} />
        <Route exact path="/createContract" component={CreateContract} />
        <Route exact path="/editContract/:contractId" component={EditContract} />
        <Route exact path="/editContractDocument/:contractId" component={EditContractDocument} />
        <Route exact path="/watchContract/:contractId" component={WatchContract} />
        <Route exact path="/contractManagement/:contractId" component={ContractView} />
        <Route exact path="/deliveries" component={DeliveriesScreen} />
        <Route exact path="/createDelivery/:category" component={CreateDelivery} />
        <Route exact path="/editDelivery/:category/:deliveryId" component={EditDelivery} />
        <Route exact path="/itemGroupsManagement" component={ItemGroupsManagementList} />
        <Route exact path="/createItemGroup" component={CreateItemGroup} />
        <Route exact path="/itemGroups/:itemGroupId/contractDocumentTemplate/:itemGroupDocumentTemplateId" component={EditItemGroupDocument} />
        <Route exact path="/createAndEditItemGroupPrices/:itemGroupId" component={ItemGroupPricesList} />
        <Route exact path="/createWeekDeliveryPrediction/:category" component={CreateWeekDeliveryPrediction} />
        <Route exact path="/manageIncomingDeliveries" component={ManageIncomingDeliveries} />
        <Route exact path="/manageIncomingDeliveries/:deliveryId" component={ManageDelivery} />
        <Route exact path="/productsManagement" component={ProductsList} />
        <Route exact path="/createProduct" component={CreateProduct} />
        <Route exact path="/editProduct/:productId" component={EditProduct} />
        <Route exact path="/operationsManagement" component={OperationsList} />
      </div>
    );
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated
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

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(MainPage) as any);