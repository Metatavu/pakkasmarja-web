import * as React from "react";

interface Props {
  errorMessage: string;
}

class ErrorMessage extends React.Component<Props, {}> {
  render() {
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