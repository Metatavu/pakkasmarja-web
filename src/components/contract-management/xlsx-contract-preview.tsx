import * as React from "react";

import strings from "src/localization/strings";
import ContractPreviewTable from "./contract-preview-table";
import { Button, Dimmer, Header, Label, Loader, Modal, Progress } from "semantic-ui-react";
import Api, { Contract, ContractPreviewData } from "pakkasmarja-client";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Component props
 */
interface Props {
  /**
   * Keycloak instance
   */
  keycloak?: Keycloak.KeycloakInstance;
  /**
   * Given file
   */
  file?: File;
  /**
   * Contract object cancelled
   */
  onCancel: () => void;
  /**
   * Import results accepted
   */
  onAcceptResults: () => void;
}

/**
 * Import results
 */
interface ImportData {
  importing: boolean;
  total: number;
  succeeded: ContractPreviewData[];
  failed: { preview: ContractPreviewData, reason: unknown }[];
}

/**
 * Component state
 */
interface State {
  parsingFile: boolean;
  contractPreviews: ContractPreviewData[];
  importData?: ImportData;
}

/**
 * Class for displaying xlsx contract preview
 */
class XlsxContractsImporter extends React.Component<Props, State> {

  /**
   * Component constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      parsingFile: false,
      contractPreviews: []
    };
  }

  /**
   * Component did update life-cycle event
   *
   * @param prevProps previous component properties
   */
  public componentDidUpdate = (prevProps: Props) => {
    const { file } = this.props;

    if (prevProps.file !== file && !!file) {
      this.getContractPreviewsFromFile(file);
    }
  }

  /**
   * Component render
   */
  public render = () => {
    const { file, onCancel } = this.props;
    const { importData } = this.state;

    return (
      <Modal
        open={ !!file }
        onClose={ onCancel }
        style={{ width: "100%", height: "100%", overflow: "scroll" }}
      >
        <Modal.Header>{ strings.contractPreview }</Modal.Header>
        <Modal.Content>
          { this.renderContent() }
        </Modal.Content>
        <Modal.Actions>
          { !importData ? this.renderImportActions() : null }
          { !!importData && !importData.importing ? this.renderResultsActions() : null }
        </Modal.Actions>
      </Modal>
    );
  }

  /**
   * Renders content
   */
  private renderContent = () => {
    const { contractPreviews, parsingFile, importData } = this.state;

    if (parsingFile) {
      return (
        <Dimmer active inverted>
          <Loader indeterminate>{ strings.gatheringContracts }</Loader>
        </Dimmer>
      );
    }

    if (!!importData) {
      const { total, failed, succeeded, importing } = importData;
      const progress = succeeded.length + failed.length;

      if (importing) {
        return (
          <div>
            <Progress
              active
              color="red"
              label="Tuodaan sopimuksia..."
              total={ total }
              value={ progress }
              progress="ratio"
            />
          </div>
        );
      }

      return (
        <>
          <Header size="medium">Tulokset</Header>
          { succeeded.length > 0 &&
            <Label
              content={`${succeeded.length} sopimusta tuotu onnistuneesti`}
              icon="checkmark"
              color="green"
            />
          }
          { failed.length > 0 &&
            <>
              <Label
                content={`${failed.length} sopimuksen tuonnissa tapahtui virhe`}
                icon="warning sign"
                color="red"
              />
              <Header>Virheelliset sopimukset</Header>
              <ContractPreviewTable
                error
                contractPreviews={ failed.map(item => item.preview) }
              />
            </>
          }
        </>
      );
    }

    return (
      <ContractPreviewTable contractPreviews={ contractPreviews } />
    );
  }

  /**
   * Renders import actions
   */
  private renderImportActions = () => {
    const { parsingFile, importData, contractPreviews } = this.state;

    return (
      <>
        <Button
          onClick={ this.cancelImport }
          disabled={ parsingFile || importData?.importing }
        >
          { strings.cancel }
        </Button>
        <AsyncButton
          color="red"
          icon="checkmark"
          labelPosition="right"
          content={ strings.accept }
          onClick={ () => this.createContractsFromPreviews(contractPreviews) }
          disabled={ parsingFile ||importData?.importing || this.hasErrors() }
        />
      </>
    );
  }

  /**
   * Renders results actions
   */
  private renderResultsActions = () => {
    return (
      <Button
        color="red"
        icon="checkmark"
        labelPosition="right"
        content="OK"
        onClick={ this.acceptImportResults }
      />
    );
  }

  /**
   * Method for parsing xlsx file
   *
   * @param file file
   * @returns promise of contract preview data array
   */
  private parseXlsxFile = async (file: File): Promise<ContractPreviewData[]> => {
    const { keycloak } = this.props;

    if (!keycloak?.token) {
      return Promise.reject();
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      const requestUrl = `${ process.env.REACT_APP_API_URL }/rest/v1/contractPreviews`;
      const response = await fetch(requestUrl, {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${ keycloak.token }`
        }
      });

      return await response.json();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Method for getting contract previews from file
   *
   * @param file file
   */
  private getContractPreviewsFromFile = async (file: File) => {
    this.setState({ parsingFile: true });

    try {
      const contractPreviews = await this.parseXlsxFile(file);
      this.setState({ contractPreviews: contractPreviews, parsingFile: false });
    } catch (error) {
      this.setState({ parsingFile: false });
    }
  }

  /**
   * Method for creating contracts from previews
   *
   * @param contracts contracts
   */
  private createContractsFromPreviews = async (contractPreviews: ContractPreviewData[]) => {
    const { keycloak } = this.props;

    if (!keycloak?.token) return;

    this.setState({
      importData: {
        importing: true,
        total: contractPreviews.length,
        succeeded: [],
        failed: []
      }
    });

    const contractsService = Api.getContractsService(keycloak.token);

    for (const preview of contractPreviews) {
      try {
        const createdContract = await new Promise<Contract>((resolve, reject) => {
          contractsService.createContract(preview.contract).then(result => {
            const possibleContract = result as unknown as Contract | { code: number, message: string };

            "code" in possibleContract ?
              reject(possibleContract.message) :
              resolve(possibleContract);
          }).catch(reject)
        });

        if (!createdContract) throw new Error("Failed to create contract");

        this.setImportData({
          succeeded: [
            ...this.state.importData?.succeeded || [],
            { ...preview, contract: createdContract }
          ]
        });
      } catch (error) {
        console.log(error);
        this.setImportData({
          failed: [
            ...this.state.importData?.failed || [],
            { preview: preview, reason: error }
          ]
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    this.setImportData({ importing: false });
  }

  /**
   * Updates results
   *
   * @param results results
   */
  private setImportData = (results: Partial<ImportData>) => {
    this.setState(prevState => ({
      importData: {
        ...prevState.importData || {
          failed: [],
          succeeded: [],
          total: 0,
          importing: false
        },
        ...results
      }
    }));
  }

  /**
   * Cancels import
   */
  private cancelImport = () => {
    this.reset();
    this.props.onCancel();
  };

  /**
   * Resets component state
   */
  private reset = () => {
    this.setState({
      contractPreviews: [],
      parsingFile: false,
      importData: undefined
    });
  };

  /**
   * Accepts import results
   */
  private acceptImportResults = () => {
    this.reset();
    this.props.onAcceptResults();
  }

  /**
   * Method for checking if there are
   * errors in imported contracts
   *
   * @returns boolean
   */
  private hasErrors = (): boolean => {
    const { contractPreviews } = this.state;
    return contractPreviews.some(preview => preview.errors.length);
  }

}

export default XlsxContractsImporter;
