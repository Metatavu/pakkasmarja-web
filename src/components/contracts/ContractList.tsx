import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, ContractTableData } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import Api from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Segment, Item, Header } from "semantic-ui-react";
import ContractItem from "./ContractItem";
import strings from "../../localization/strings";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  frozenContracts: ContractTableData[];
  freshContracts: ContractTableData[];
  itemGroups: ItemGroup[];
  contractsLoading: boolean;
}

/**
 * News list component
 */
class ContractList extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      frozenContracts: [],
      freshContracts: [],
      itemGroups: [],
      contractsLoading: false,
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    this.setState({ contractsLoading: true });

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const frozenContracts = await contractsService.listContracts("application/json", false, "FROZEN");
    console.log(frozenContracts);
    const freshContracts = await contractsService.listContracts("application/json", false, "FRESH");
    console.log(freshContracts);
    await this.loadItemGroups();

    frozenContracts.forEach((frozenContract) => {
      const frozenContractsState: ContractTableData[] = this.state.frozenContracts;
      const itemGroup = this.state.itemGroups.find(itemGroup => itemGroup.id === frozenContract.itemGroupId);
      frozenContractsState.push({
        contract: frozenContract,
        itemGroup: itemGroup
      });

      this.setState({ frozenContracts: frozenContractsState });
    });

    freshContracts.forEach((freshContract) => {
      const freshContractsState: ContractTableData[] = this.state.freshContracts;
      const itemGroup = this.state.itemGroups.find(itemGroup => itemGroup.id === freshContract.itemGroupId);
      freshContractsState.push({
        contract: freshContract,
        itemGroup: itemGroup
      });
      
      this.setState({ freshContracts: freshContractsState });
    });

    this.setState({ contractsLoading: false });

  }

  /**
   * Load item groups
   */
  private loadItemGroups = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroups = await itemGroupsService.listItemGroups();
    this.setState({ itemGroups: itemGroups });
  }

  render() {
    return (
      <BasicLayout>
        <Segment>
          <Header>
            {strings.frozenContracts}
          </Header>
          <Item.Group divided>
            {
              this.state.frozenContracts.map((frozenContract) => {
                return <ContractItem key={frozenContract.contract.id} contractData={frozenContract} />;
              })
            }
          </Item.Group>
        </Segment>
        <Segment>
          <Header>
            {strings.freshContracts}
          </Header>
          <Item.Group divided>
            {
              this.state.freshContracts.map((freshContract) => {
                return <ContractItem key={freshContract.contract.id} contractData={freshContract} />;
              })
            }
          </Item.Group>
        </Segment>
      </BasicLayout>
    );
  }
}

export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ContractList);