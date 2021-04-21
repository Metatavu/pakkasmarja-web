import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, ContractTableData, ChatWindow } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, Button, Dimmer, Loader } from "semantic-ui-react";
import ContractProposalModal from "./ContractProposalModal";
import strings from "src/localization/strings";
import * as _ from "lodash";
import ContractListContainer from "./ContractListContainer";
import AppConfig from "src/utils/AppConfig";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  chatOpen: (chat: ChatWindow) => void;
}

/**
 * Interface for component state
 */
interface State {
  keycloak?: Keycloak.KeycloakInstance;
  itemGroups: ItemGroup[];
  contractsLoading: boolean;
  proposeContractModalOpen: boolean;
  selectedBerry: string;
  proposedContractQuantity: string;
  proposedContractQuantityComment: string;
  proposeContractModalType: string;
  frozenContractsActive?: ContractTableData[]
  frozenContractsDraft?: ContractTableData[]
  frozenContractsPast?: ContractTableData[]
  freshContractsActive?: ContractTableData[]
  freshContractsDraft?: ContractTableData[]
  freshContractsPast?: ContractTableData[]
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
    const frozenContracts = await contractsService.listContracts("application/json", false, "FROZEN", undefined, undefined, undefined, undefined, 1000);
    const freshContracts = await contractsService.listContracts("application/json", false, "FRESH", undefined, undefined, undefined, undefined, 1000);
    await this.loadItemGroups();
    const frozenTableData: ContractTableData[] = [];
    const freshTableData: ContractTableData[] = [];

    frozenContracts.forEach((frozenContract) => {
      const itemGroup = this.state.itemGroups.find(itemGroup => itemGroup.id === frozenContract.itemGroupId);
      frozenTableData.push({
        contract: frozenContract,
        itemGroup: itemGroup
      });
    });

    freshContracts.forEach((freshContract) => {
      const itemGroup = this.state.itemGroups.find(itemGroup => itemGroup.id === freshContract.itemGroupId);
      freshTableData.push({
        contract: freshContract,
        itemGroup: itemGroup
      });
    });

    const frozenContractsActive: ContractTableData[] = _.filter(frozenTableData, ({ contract }) => contract.status === "APPROVED");
    const frozenContractsDraft: ContractTableData[] = _.filter(frozenTableData, ({ contract }) => contract.status === "DRAFT" || contract.status === "ON_HOLD" || contract.status === "REJECTED");
    const frozenContractsPast: ContractTableData[] = _.filter(frozenTableData, ({ contract }) => contract.status === "TERMINATED");
    const freshContractsActive: ContractTableData[] = _.filter(freshTableData, ({ contract }) => contract.status === "APPROVED");
    const freshContractsDraft: ContractTableData[] = _.filter(freshTableData, ({ contract }) => contract.status === "DRAFT" || contract.status === "ON_HOLD" || contract.status === "REJECTED");
    const freshContractsPast: ContractTableData[] = _.filter(freshTableData, ({ contract }) => contract.status === "TERMINATED");

    this.setState({
      frozenContractsActive,
      frozenContractsDraft,
      frozenContractsPast,
      freshContractsActive,
      freshContractsDraft,
      freshContractsPast,
      contractsLoading: false
    });

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

    const appConfig = await AppConfig.getAppConfig();
    const questionGroupId = appConfig['contracts-question-group'];
    if (!questionGroupId || !this.props.keycloak || !this.props.keycloak.token) {
      return
    }

    this.setState({
      contractsLoading: true
    });

    const questionGroupThreads = await Api.getChatThreadsService(this.props.keycloak.token).listChatThreads(questionGroupId, "QUESTION", this.props.keycloak.subject);
    if (questionGroupThreads.length != 1) {
      return; //Application is misconfigured, bail out.
    }
    const threadId = questionGroupThreads[0].id!;
    await Api.getChatMessagesService(this.props.keycloak.token).createChatMessage({
      contents: this.getProposalMessageContents(),
      threadId: threadId,
      userId: this.props.keycloak.subject
    }, threadId);


    this.props.chatOpen({
      open: true,
      threadId: threadId,
      answerType: "TEXT",
      conversationType: "QUESTION"
    });

    this.setState({
      contractsLoading: false,
      proposeContractModalOpen: false
    });
  }

  /**
   * Gets message to use for suggesting new contract
   */
  private getProposalMessageContents = (): string => {
    const { selectedBerry, itemGroups } = this.state;
    const itemGroup = itemGroups.find((itemgroup) => itemgroup.id == selectedBerry);
    let message = `Hei, haluaisin ehdottaa uutta sopimusta marjasta: ${itemGroup ? itemGroup.displayName : ""}.`;
    if (this.state.proposedContractQuantity) {
      message += `
      Määräarvio on ${this.state.proposedContractQuantity} kg.`;
    }
    if (this.state.proposedContractQuantityComment) {
      message += `
      Lisätietoa: ${this.state.proposedContractQuantityComment}`;
    }

    return message;
  }

  /**
   * On propose new contract clicked
   * 
   * @param type type
   */
  private onProposeNewContractClick = async (type: string) => {
    await this.setState({ proposeContractModalOpen: true, proposeContractModalType: type });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.contractsLoading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              {strings.loading}
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <BasicLayout pageTitle="Sopimukset">
        <Header as="h2">
          {strings.frozen}
        </Header>
        {
          this.state.frozenContractsDraft && this.state.frozenContractsDraft.length > 0 &&
          <ContractListContainer
            header={strings.contractsOnDraft}
            contractDatas={this.state.frozenContractsDraft}
          />
        }
        {
          this.state.frozenContractsActive && this.state.frozenContractsActive.length > 0 &&
          <ContractListContainer
            header={strings.contractsOnActive}
            contractDatas={this.state.frozenContractsActive}
            contractState={"active"} />
        }
        {
          this.state.frozenContractsPast && this.state.frozenContractsPast.length > 0 &&
          <ContractListContainer
            header={strings.contractsOnTerminated}
            contractDatas={this.state.frozenContractsPast}
          />
        }
        <Button onClick={() => this.onProposeNewContractClick("FROZEN")} style={{ borderRadius: 0 }} color="red">
          {strings.suggestNewFrozenContract}
        </Button>
        <Header as="h2">
          {strings.fresh}
        </Header>
        {
          this.state.freshContractsDraft && this.state.freshContractsDraft.length > 0 &&
          <ContractListContainer
            header={strings.contractsOnDraft}
            contractDatas={this.state.freshContractsDraft}
          />
        }
        {
          this.state.freshContractsActive && this.state.freshContractsActive.length > 0 &&
          <ContractListContainer
            header={strings.contractsOnActive}
            contractDatas={this.state.freshContractsActive}
            contractState={"active"}
          />
        }
        {
          this.state.freshContractsPast && this.state.freshContractsPast.length > 0 &&
          <ContractListContainer
            header={strings.contractsOnTerminated}
            contractDatas={this.state.freshContractsPast}
          />
        }
        <AsyncButton
          onClick={ async () => await this.onProposeNewContractClick("FRESH") }
          style={{ borderRadius: 0 } }
          color="red"
        >
          {strings.suggestNewFreshContract}
        </AsyncButton>
        <ContractProposalModal
          modalOpen={this.state.proposeContractModalOpen}
          contractType={this.state.proposeContractModalType}
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
    chatOpen: (chat: ChatWindow) => dispatch(actions.chatOpen(chat))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ContractList);
