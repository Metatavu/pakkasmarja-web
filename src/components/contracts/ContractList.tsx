import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, ContractTableData } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import Api from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, Button } from "semantic-ui-react";
import ContractItem from "./ContractItem";
import ContractProposalModal from "./ContractProposalModal";
import strings from "src/localization/strings";

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
  proposeContractModalOpen: boolean;
  selectedBerry: string;
  proposedContractQuantity: string;
  proposedContractQuantityComment: string;
  proposeContractModalType: string;
}

/**
 * Class for contract list component
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
      proposeContractModalOpen: false,
      selectedBerry: "",
      proposedContractQuantity: "",
      proposedContractQuantityComment: "",
      proposeContractModalType: ""
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
    const freshContracts = await contractsService.listContracts("application/json", false, "FRESH");
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

  /**
   * On contract proposal clicked
   */
  private onContractProposalClick = async () => {
    //TODO: Implement when chat messages are ready
  }

  /**
   * On propose new contract clicked
   * 
   * @param type type
   */
  private onProposeNewContractClick = async (type: string) => {
    this.setState({ proposeContractModalOpen: true, proposeContractModalType: type });
  }

  /**
   * Render method
   */
  public render() {
    return (
      <BasicLayout pageTitle="Sopimukset">
        <Header as="h2">
          {strings.frozenContracts}
        </Header>
        <div className="contract-blue-container">
          {
            this.state.frozenContracts.map((frozenContract) => {
              return <ContractItem key={frozenContract.contract.id} contractData={frozenContract} />;
            })
          }
        </div>
        <Button onClick={() => this.onProposeNewContractClick("FROZEN")} style={{borderRadius: 0}} color="red">
          {strings.suggestNewFrozenContract}
        </Button>
        <Header as="h2">
          {strings.freshContracts}
        </Header>
        <div className="contract-blue-container">
          {
            this.state.freshContracts.map((freshContract) => {
              return <ContractItem key={freshContract.contract.id} contractData={freshContract} />;
            })
          }
        </div>
        <Button onClick={() => this.onProposeNewContractClick("FRESH")} style={{borderRadius: 0}} color="red">
          {strings.suggestNewFreshContract}
        </Button>
        <ContractProposalModal
          modalOpen={this.state.proposeContractModalOpen}
          itemGroups={this.state.itemGroups}
          closeModal={() => this.setState({ proposeContractModalOpen: false })}
          onSelectedBerryChange={(value: string) => this.setState({ selectedBerry: value })}
          onQuantityChange={(value: string) => this.setState({ proposedContractQuantity: value })}
          onQuantityCommentChange={(value: string) => this.setState({ proposedContractQuantityComment: value })}
          quantityComment={this.state.proposedContractQuantityComment}
          selectedBerry={this.state.selectedBerry}
          quantity={this.state.proposedContractQuantity}
          sendContractProposalClicked={() => this.onContractProposalClick()}
        />
      </BasicLayout>
    );
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
export function mapStateToProps(state: StoreState) {
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
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ContractList);