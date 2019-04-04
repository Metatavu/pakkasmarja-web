import * as React from "react";

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
        <h1>Virhe!</h1>
        {
          <p>
            {
              this.props.errorMessage ? this.props.errorMessage : "Jokin meni pieleen..."
            }
          </p>
        }
      </div>
    );
  }
}

export default ErrorMessage;