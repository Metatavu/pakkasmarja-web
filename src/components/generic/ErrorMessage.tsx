import * as React from "react";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  errorMessage: string;
}

/**
 * Class for error message component
 */
class ErrorMessage extends React.Component<Props, {}> {

  /**
   * Render method
   */
  public render() {
    return (
      <div>
        <h1>{strings.error}</h1>
        {
          <p>
            {
              this.props.errorMessage ? this.props.errorMessage : strings.somethingWentWrong
            }
          </p>
        }
      </div>
    );
  }
}

export default ErrorMessage;