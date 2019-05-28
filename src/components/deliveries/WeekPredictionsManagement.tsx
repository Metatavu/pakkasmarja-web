import * as _ from "lodash";
import * as React from "react";
import * as actions from "../../actions/";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { ItemGroup, WeekDeliveryPrediction, Contact } from "pakkasmarja-client";
import { Loader, Dropdown, Table, DropdownProps, Icon } from "semantic-ui-react";
import * as moment from "moment";
import TableBasicLayout from "../contract-management/TableBasicLayout";
import "./styles.css"
import { StoreState, Options } from "../../types";
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
  loading: boolean
  selectedItemGroupId?: string,
  selectedWeekNumber: number,
  error?: string
  itemGroups: ItemGroup[],
  weekPredictions?: WeekDeliveryPrediction[],
  contacts?: (Contact | undefined)[]
  predictionsWithContacts?: { prediction: WeekDeliveryPrediction, contact: Contact | undefined }[];
}

/**
 * Class for week predictions management
 */
class WeekPredictionsManagement extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      itemGroups: [],
      selectedWeekNumber: moment().isoWeek()
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return;
    }

    this.setState({ loading: true });
    this.loadItemGroups();
    this.setState({
      loading: false
    });
  }

  /**
   * Component did update life-sycle event
   */
  public componentDidUpdate = async (prevProps: Props, prevState: State) => {

    if (prevState.selectedItemGroupId !== this.state.selectedItemGroupId || prevState.selectedWeekNumber !== this.state.selectedWeekNumber) {
      const { keycloak } = this.props;
      if (!keycloak || !keycloak.token) {
        return;
      }
      this.setState({ predictionsWithContacts: undefined });
      this.loadWeekPredictions();
    }
  }

  /**
   * Render method
   */
  public render() {

    const itemGroupOptions: Options[] = this.state.itemGroups.map((itemGroup) => {
      return {
        key: itemGroup.id,
        value: itemGroup.id,
        text: itemGroup.name
      };
    });

    const weekNumberOptions = Array.from({ length: 52 }, (v, k) => {
      return {
        key: k + 1,
        value: k + 1,
        text: "viikko " + (k + 1)
      };
    });

    const totalAmount = _.sumBy(this.state.weekPredictions, (pred) => pred.amount);

    return (
      <TableBasicLayout error={this.state.error} onErrorClose={() => this.setState({ error: undefined })} pageTitle="Viikkoennusteet">
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ display: "flex", flex: 1, justifyContent: "center", padding: 10, fontSize: "1.5em" }}><p>Valitse tuote ja viikko</p></div>
          <div style={{ display: "flex", flex: 1, flexDirection: "row" }}>
            <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", marginRight: "0.5%" }}>
              <Dropdown
                selection
                placeholder="Tuote ryhmät"
                options={itemGroupOptions}
                value={this.state.selectedItemGroupId}
                search
                onChange={(e, data) => this.handleItemGroupChange(data)}
              />
            </div>
            <div style={{ display: "flex", flex: 1, justifyContent: "flex-start", marginLeft: "0.5%" }}>
              <Dropdown
                selection
                placeholder="Viikot"
                options={weekNumberOptions}
                value={this.state.selectedWeekNumber}
                search
                onChange={(e, data) => this.handleWeekNumberChange(data)}
              />
            </div>
          </div>
        </div>
        {this.state.loading ? <Loader size="medium" content={strings.loading} active /> :
          this.state.predictionsWithContacts &&
          <Table celled padded selectable>
            <Table.Header>
              <Table.Row className="table-header-row">
                <Table.HeaderCell width={2} >Viljelijä</Table.HeaderCell>
                <Table.HeaderCell width={1} textAlign='center'>Määrä</Table.HeaderCell>
                <Table.HeaderCell width={1} textAlign='center'>Maanantai</Table.HeaderCell>
                <Table.HeaderCell width={1} textAlign='center'>Tiistai</Table.HeaderCell>
                <Table.HeaderCell width={1} textAlign='center'>Keskiviikko</Table.HeaderCell>
                <Table.HeaderCell width={1} textAlign='center'>Torstai</Table.HeaderCell>
                <Table.HeaderCell width={1} textAlign='center'>Perjantai</Table.HeaderCell>
                <Table.HeaderCell width={1} textAlign='center'>Lauantai</Table.HeaderCell>
                <Table.HeaderCell width={1} textAlign='center'>Sunnuntai</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {
                this.state.predictionsWithContacts.map((predictionWithContact) => {
                  if (!predictionWithContact || !predictionWithContact.contact) {
                    return;
                  }
                  const { prediction, contact } = predictionWithContact;
                  return (
                    <Table.Row key={prediction.id} className="table-header-row">
                      <Table.Cell>
                        {contact.displayName}
                      </Table.Cell>
                      <Table.Cell textAlign='center'>
                        {prediction.amount}
                      </Table.Cell>
                      <Table.Cell textAlign='center'>
                        {this.checkPredictionDay(prediction, "monday")}
                      </Table.Cell>
                      <Table.Cell textAlign='center'>
                        {this.checkPredictionDay(prediction, "tuesday")}
                      </Table.Cell>
                      <Table.Cell textAlign='center'>
                        {this.checkPredictionDay(prediction, "wednesday")}
                      </Table.Cell>
                      <Table.Cell textAlign='center'>
                        {this.checkPredictionDay(prediction, "thursday")}
                      </Table.Cell>
                      <Table.Cell textAlign='center'>
                        {this.checkPredictionDay(prediction, "friday")}
                      </Table.Cell>
                      <Table.Cell textAlign='center'>
                        {this.checkPredictionDay(prediction, "saturday")}
                      </Table.Cell>
                      <Table.Cell textAlign='center'>
                        {this.checkPredictionDay(prediction, "sunday")}
                      </Table.Cell>
                    </Table.Row>
                  );
                })
              }
              <Table.Row positive>
                <Table.Cell width={2} >
                  <b>Yhteensä</b>
                </Table.Cell>
                <Table.Cell width={1} textAlign='center'>
                  <b>{totalAmount}</b>
                </Table.Cell>
                <Table.Cell width={1} />
                <Table.Cell width={1} />
                <Table.Cell width={1} />
                <Table.Cell width={1} />
                <Table.Cell width={1} />
                <Table.Cell width={1} />
                <Table.Cell width={1} />
              </Table.Row>
            </Table.Body>
          </Table>
        }
      </TableBasicLayout >
    );
  }

  /**
   * Check if prediction day is true
   * 
   * @param prediction week delivery prediction array
   * @param day what day to check
   */
  private checkPredictionDay = (prediction: WeekDeliveryPrediction, day: string) => {
    const dayIsTrue = prediction.days[day];
    const icon: JSX.Element = dayIsTrue ? <Icon color='green' name='checkmark' size='large' /> : <Icon color='red' name='close' size='large' />;
    return icon;
  }

  /**
   * Handles item group change
   * @param data Dropdownprops
   */
  private handleItemGroupChange = (data: DropdownProps) => {
    this.setState({ selectedItemGroupId: data.value as string })
  }

  /**
   * Handles item group change
   * @param data Dropdownprops
   */
  private handleWeekNumberChange = (data: DropdownProps) => {
    this.setState({ selectedWeekNumber: data.value as number })
  }

  /**
    * Loads item groups from the server
    */
  private loadItemGroups = async () => {
    const { keycloak } = this.props;
    if (keycloak && keycloak.token) {
      const itemGroups = await Api.getItemGroupsService(keycloak.token).listItemGroups();
      this.setState({ itemGroups });
    }
  }

  /**
   * Loads week predictions from the server
   */
  private loadWeekPredictions = async () => {
    this.setState({ loading: true })
    const { keycloak } = this.props;
    const { selectedItemGroupId, selectedWeekNumber } = this.state;
    if (keycloak && keycloak.token) {
      const weekPredictions = await Api.getWeekDeliveryPredictionsService(keycloak.token).listWeekDeliveryPredictions(
        selectedItemGroupId,
        undefined,
        undefined,
        selectedWeekNumber,
        moment().year(),
        0,
        9999
      );
      this.setState({ weekPredictions, loading: false }, () => this.loadContacts());
    }
  }


  /**
   * Loads contacts from the server
   */
  private loadContacts = async () => {
    this.setState({ loading: true })
    const { keycloak } = this.props;
    const { weekPredictions } = this.state;
    if (keycloak && keycloak.token && weekPredictions && weekPredictions[0]) {
      const token = keycloak.token;
      const uniqueContactIds = _.uniqBy(weekPredictions, (pred) => pred.userId).map((pred) => { return pred.userId });
      const arrayOfPromises = await uniqueContactIds.map(async (contactId) => {
        if (contactId) {
          return await Api.getContactsService(token).findContact(contactId);
        }
        return;
      });
      const contacts = await Promise.all(arrayOfPromises);
      const uniqueContacts = _.uniqBy(contacts, contact => contact!.id);
      this.setState({ contacts: uniqueContacts }, () => this.combinePredictionWithContact());
    }
    this.setState({ loading: false })
  }

  /**
   * Combines predictions with contacts
   */
  private combinePredictionWithContact = () => {
    const { contacts, weekPredictions } = this.state;
    if (contacts && weekPredictions) {
      const predictionsWithContacts = weekPredictions.map((pred) => {
        return {
          prediction: pred,
          contact: contacts.find(contact => contact ? contact.id === pred.userId : false)
        }
      });
      const sortedByContactName = _.sortBy(predictionsWithContacts, (obj) => obj.contact && obj.contact.displayName);
      this.setState({ predictionsWithContacts: sortedByContactName });
    }
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

export default connect(mapStateToProps, mapDispatchToProps)(WeekPredictionsManagement);
